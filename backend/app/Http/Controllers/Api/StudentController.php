<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\StoreStudentRequest;
use App\Http\Requests\Student\UpdateStudentRequest;
use App\Http\Resources\StudentResource;
use App\Models\School;
use App\Models\Student;
use App\Services\StudentService;
use App\Support\NigerianStates;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentController extends Controller
{
    public function __construct(protected StudentService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = Student::query()
            ->with(['user:id,name,email', 'enrollments.schoolClass:id,name', 'enrollments.arm:id,name']);

        if ($search = $request->string('search')->toString()) {
            $query->search($search);
        }

        if ($classId = $request->integer('school_class_id')) {
            $query->inClass($classId);
        }

        if ($armId = $request->integer('arm_id')) {
            $query->inArm($armId);
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $sort = $request->string('sort', 'id')->toString();
        $direction = $request->string('direction', 'desc')->toString();
        $allowedSorts = ['id', 'admission_number', 'created_at', 'admitted_on', 'status'];

        if (in_array($sort, $allowedSorts, true)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) min(max($request->integer('per_page', 15), 1), 100);

        return StudentResource::collection($query->paginate($perPage))->response();
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $school = $this->currentSchoolOrFail();

        $student = $this->service->create($school, $request->validated());

        return (new StudentResource($student))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Student $student): StudentResource
    {
        $student->load([
            'user:id,name,email,phone',
            'parent:id,name,email,phone',
            'enrollments.schoolClass:id,name,level',
            'enrollments.arm:id,name',
            'fees',
        ]);

        return new StudentResource($student);
    }

    public function update(UpdateStudentRequest $request, Student $student): StudentResource
    {
        $student = $this->service->update($student, $request->validated());

        return new StudentResource($student);
    }

    public function destroy(Student $student): JsonResponse
    {
        $student->delete();

        return response()->json(['message' => 'Student deleted.']);
    }

    /**
     * Reference data: Nigerian states list (used by the frontend form).
     */
    public function states(): JsonResponse
    {
        return response()->json(['states' => NigerianStates::all()]);
    }

    /**
     * Download a CSV template for bulk-import (Excel opens .csv natively).
     */
    public function importTemplate(): StreamedResponse
    {
        $headers = [
            'name', 'email', 'date_of_birth', 'gender', 'religion',
            'state_of_origin', 'lga', 'address', 'guardian_name', 'guardian_phone',
            'guardian_email', 'guardian_relationship', 'blood_group',
            'school_class_name', 'arm_name',
        ];

        $sample = [
            'Adaeze Okafor',
            'adaeze.okafor@example.com',
            '2012-03-15',
            'female',
            'Christianity',
            'Lagos',
            'Eti-Osa',
            '12 Ahmadu Bello Way, VI',
            'Mr. Chinedu Okafor',
            '+2348012345678',
            'parent@example.com',
            'Father',
            'O+',
            'JSS1',
            'A',
        ];

        return response()->streamDownload(function () use ($headers, $sample) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);
            fputcsv($out, $sample);
            fclose($out);
        }, 'students-import-template.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Bulk import students from a CSV upload. Each row is processed in its own
     * transaction so partial failures don't abort the whole batch.
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

        while (($row = fgetcsv($handle)) !== false) {
            $line++;
            if ($row === [null] || $row === false) continue;

            $row = array_pad($row, count($headers), null);
            $data = array_combine($headers, array_map(fn ($v) => is_string($v) ? trim($v) : $v, $row));

            try {
                $payload = [
                    'name' => $data['name'] ?? null,
                    'email' => $data['email'] ?? null,
                    'date_of_birth' => $data['date_of_birth'] ?? null,
                    'gender' => $data['gender'] ?? null,
                    'religion' => $data['religion'] ?? null,
                    'state_of_origin' => $data['state_of_origin'] ?? null,
                    'lga' => $data['lga'] ?? null,
                    'address' => $data['address'] ?? null,
                    'guardian_name' => $data['guardian_name'] ?? null,
                    'guardian_phone' => $data['guardian_phone'] ?? null,
                    'guardian_email' => $data['guardian_email'] ?? null,
                    'guardian_relationship' => $data['guardian_relationship'] ?? null,
                    'blood_group' => $data['blood_group'] ?? null,
                ];

                if (empty($payload['name'])) {
                    throw new \RuntimeException("Row {$line}: name is required.");
                }

                if (! empty($data['school_class_name'])) {
                    $class = $school->classes()->where('name', $data['school_class_name'])->first();
                    if ($class) {
                        $payload['school_class_id'] = $class->id;
                        if (! empty($data['arm_name'])) {
                            $arm = $class->arms()->where('name', $data['arm_name'])->first();
                            if ($arm) {
                                $payload['arm_id'] = $arm->id;
                            }
                        }
                    }
                }

                $this->service->create($school, $payload);
                $created++;
            } catch (\Throwable $e) {
                $errors[] = "Line {$line}: ".$e->getMessage();
            }
        }

        fclose($handle);

        return response()->json([
            'created' => $created,
            'errors' => $errors,
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
}
