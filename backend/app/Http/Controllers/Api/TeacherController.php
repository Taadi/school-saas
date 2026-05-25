<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Teacher\StoreTeacherRequest;
use App\Http\Requests\Teacher\UpdateTeacherRequest;
use App\Http\Resources\TeacherResource;
use App\Models\School;
use App\Models\Teacher;
use App\Services\TeacherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TeacherController extends Controller
{
    public function __construct(protected TeacherService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = Teacher::query()->with('user:id,name,email,phone,is_active');

        if ($search = $request->string('search')->toString()) {
            $query->search($search);
        }

        if ($subject = $request->string('subject')->toString()) {
            $query->where('subject_specialization', 'like', "%{$subject}%");
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($gender = $request->string('gender')->toString()) {
            $query->where('gender', $gender);
        }

        $sort = $request->string('sort', 'id')->toString();
        $direction = $request->string('direction', 'desc')->toString() === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['id', 'staff_id', 'created_at', 'date_employed', 'status', 'years_of_experience'];
        if (in_array($sort, $allowedSorts, true)) {
            $query->orderBy($sort, $direction);
        }

        $perPage = (int) min(max($request->integer('per_page', 15), 1), 100);

        return TeacherResource::collection($query->paginate($perPage))->response();
    }

    public function store(StoreTeacherRequest $request): JsonResponse
    {
        $school = $this->currentSchoolOrFail();

        $teacher = $this->service->create($school, $request->validated() + [
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'phone' => $request->input('phone'),
        ]);

        return (new TeacherResource($teacher))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Teacher $teacher): TeacherResource
    {
        $teacher->load('user:id,name,email,phone,is_active');

        return new TeacherResource($teacher);
    }

    public function update(UpdateTeacherRequest $request, Teacher $teacher): TeacherResource
    {
        $teacher = $this->service->update($teacher, $request->validated());

        return new TeacherResource($teacher);
    }

    public function destroy(Teacher $teacher): JsonResponse
    {
        // Soft-delete the teacher and disable the linked login.
        $teacher->user?->update(['is_active' => false]);
        $teacher->delete();

        return response()->json(['message' => 'Teacher removed.']);
    }

    /**
     * Upload / replace a passport photo.
     */
    public function uploadPhoto(Request $request, Teacher $teacher): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:2048'],
        ]);

        $disk = Storage::disk('public');
        $path = $request->file('photo')->store("teachers/{$teacher->tenant_id}", 'public');

        if ($teacher->passport_photo && $disk->exists($teacher->passport_photo)) {
            $disk->delete($teacher->passport_photo);
        }

        $teacher->update(['passport_photo' => $path]);

        return response()->json([
            'passport_photo' => $path,
            'url' => $disk->url($path),
        ]);
    }

    /**
     * Reset the linked user's password and return the new temporary one.
     */
    public function resetPassword(Teacher $teacher): JsonResponse
    {
        if (! $teacher->user) {
            abort(422, 'Teacher has no linked user account.');
        }

        $temp = $this->generateTempPassword();
        $teacher->user->update([
            'password' => bcrypt($temp),
            'is_active' => true,
        ]);

        return response()->json([
            'temporary_password' => $temp,
            'email' => $teacher->user->email,
        ]);
    }

    /**
     * Download a CSV template for bulk import (Excel opens .csv natively).
     */
    public function importTemplate(): StreamedResponse
    {
        $headers = [
            'name', 'email', 'phone',
            'qualification', 'years_of_experience', 'subject_specialization',
            'date_employed', 'salary_amount', 'bank_name', 'account_number', 'account_name',
            'date_of_birth', 'gender', 'marital_status', 'address',
            'state_of_origin', 'lga',
            'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship',
            'status',
        ];

        $sample = [
            'Mr. Tunde Bakare',
            'tunde.bakare@example.com',
            '+2348012345678',
            'B.Sc Mathematics, PGDE',
            '7',
            'Mathematics',
            '2024-09-01',
            '180000',
            'GTBank',
            '0123456789',
            'Tunde Bakare',
            '1990-05-12',
            'male',
            'Married',
            '12 Adeola Odeku, VI',
            'Lagos',
            'Eti-Osa',
            'Mrs. Ifeoma Bakare',
            '+2348087654321',
            'Wife',
            'active',
        ];

        return response()->streamDownload(function () use ($headers, $sample) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);
            fputcsv($out, $sample);
            fclose($out);
        }, 'teachers-import-template.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Bulk import teachers from a CSV upload. Each row processed independently.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $school = $this->currentSchoolOrFail();
        $path = $request->file('file')->getRealPath();

        $handle = fopen($path, 'r');
        if ($handle === false) {
            return response()->json(['message' => 'Could not read file.'], 422);
        }

        $headers = fgetcsv($handle);
        if (! $headers) {
            fclose($handle);
            return response()->json(['message' => 'Empty file.'], 422);
        }

        $headers = array_map(fn ($h) => trim((string) $h), $headers);

        $created = 0;
        $errors = [];
        $line = 1;
        $credentials = [];

        while (($row = fgetcsv($handle)) !== false) {
            $line++;
            if ($row === [null] || $row === false) continue;

            $row = array_pad($row, count($headers), null);
            $data = array_combine($headers, array_map(fn ($v) => is_string($v) ? trim($v) : $v, $row));

            try {
                if (empty($data['name'])) {
                    throw new \RuntimeException("Row {$line}: name is required.");
                }

                $payload = [
                    'name' => $data['name'],
                    'email' => $data['email'] ?? null,
                    'phone' => $data['phone'] ?? null,
                    'qualification' => $data['qualification'] ?? null,
                    'years_of_experience' => isset($data['years_of_experience']) && $data['years_of_experience'] !== ''
                        ? (int) $data['years_of_experience']
                        : null,
                    'subject_specialization' => $data['subject_specialization'] ?? null,
                    'date_employed' => $data['date_employed'] ?? null,
                    'salary_amount' => isset($data['salary_amount']) && $data['salary_amount'] !== ''
                        ? (float) $data['salary_amount']
                        : null,
                    'bank_name' => $data['bank_name'] ?? null,
                    'account_number' => $data['account_number'] ?? null,
                    'account_name' => $data['account_name'] ?? null,
                    'date_of_birth' => $data['date_of_birth'] ?? null,
                    'gender' => $data['gender'] ?? null,
                    'marital_status' => $data['marital_status'] ?? null,
                    'address' => $data['address'] ?? null,
                    'state_of_origin' => $data['state_of_origin'] ?? null,
                    'lga' => $data['lga'] ?? null,
                    'next_of_kin_name' => $data['next_of_kin_name'] ?? null,
                    'next_of_kin_phone' => $data['next_of_kin_phone'] ?? null,
                    'next_of_kin_relationship' => $data['next_of_kin_relationship'] ?? null,
                    'status' => $data['status'] ?? Teacher::STATUS_ACTIVE,
                ];

                $teacher = $this->service->create($school, $payload);
                $created++;

                $temp = $teacher->getAttribute('temporary_password');
                if ($temp) {
                    $credentials[] = [
                        'staff_id' => $teacher->staff_id,
                        'name' => $teacher->user?->name,
                        'email' => $teacher->user?->email,
                        'temporary_password' => $temp,
                    ];
                }
            } catch (\Throwable $e) {
                $errors[] = "Line {$line}: ".$e->getMessage();
            }
        }

        fclose($handle);

        return response()->json([
            'created' => $created,
            'errors' => $errors,
            'credentials' => $credentials,
        ]);
    }

    protected function currentSchoolOrFail(): School
    {
        $tenantId = request()->user()?->tenant_id ?? request()->header('X-Tenant-Id');

        if (! $tenantId) {
            abort(422, 'Tenant context is required.');
        }

        $school = School::find((int) $tenantId);

        if (! $school) {
            abort(404, 'School not found.');
        }

        return $school;
    }

    protected function generateTempPassword(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $out = '';
        for ($i = 0; $i < 10; $i++) {
            $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        return $out;
    }
}
