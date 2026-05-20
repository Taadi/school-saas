<?php

namespace App\Services;

use App\Models\School;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StudentService
{
    /**
     * Generate the next admission number for the given school.
     *
     * Format: {PREFIX}-{YEAR}-{SEQUENCE} (e.g. SCH-2026-001).
     *
     * The prefix is taken from `schools.settings.admission_prefix` if present,
     * otherwise the first 3 letters of the school name (uppercase).
     */
    public function generateAdmissionNumber(School $school, ?int $year = null): string
    {
        $year ??= (int) now()->year;
        $prefix = $this->prefixFor($school);

        $base = "{$prefix}-{$year}-";

        $lastNumber = Student::query()
            ->withoutTenant()
            ->where('tenant_id', $school->id)
            ->where('admission_number', 'like', $base.'%')
            ->orderByDesc('id')
            ->value('admission_number');

        $nextSeq = 1;
        if ($lastNumber && preg_match('/-(\d+)$/', $lastNumber, $m)) {
            $nextSeq = ((int) $m[1]) + 1;
        }

        return $base.str_pad((string) $nextSeq, 3, '0', STR_PAD_LEFT);
    }

    protected function prefixFor(School $school): string
    {
        $configured = $school->settings['admission_prefix'] ?? null;

        if (is_string($configured) && $configured !== '') {
            return Str::upper($configured);
        }

        $name = preg_replace('/[^A-Za-z]/', '', $school->name) ?? 'SCH';
        return Str::upper(substr($name ?: 'SCH', 0, 3));
    }

    /**
     * Create a Student inside a transaction. Auto-creates a User account when
     * `user_id` isn't supplied, optionally enrolls into a class/arm.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(School $school, array $data): Student
    {
        return DB::transaction(function () use ($school, $data) {
            $admissionNumber = $data['admission_number']
                ?? $this->generateAdmissionNumber($school);

            $userId = $data['user_id'] ?? null;

            if (! $userId) {
                $userId = $this->provisionStudentUser(
                    $school,
                    $data['name'],
                    $data['email'] ?? null,
                    $admissionNumber,
                )->id;
            }

            $student = Student::create([
                'tenant_id' => $school->id,
                'user_id' => $userId,
                'parent_user_id' => $data['parent_user_id'] ?? null,
                'admission_number' => $admissionNumber,
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
                'admitted_on' => $data['admitted_on'] ?? now()->toDateString(),
                'status' => $data['status'] ?? Student::STATUS_ACTIVE,
            ]);

            if (! empty($data['school_class_id']) && ! empty($data['arm_id'])) {
                StudentClass::updateOrCreate(
                    [
                        'student_id' => $student->id,
                        'school_class_id' => $data['school_class_id'],
                        'session_year' => $data['session_year'] ?? $this->defaultSessionYear(),
                        'term' => $data['term'] ?? 'first',
                    ],
                    [
                        'tenant_id' => $school->id,
                        'arm_id' => $data['arm_id'],
                        'status' => 'active',
                    ]
                );
            }

            return $student->fresh(['user', 'enrollments.schoolClass', 'enrollments.arm']);
        });
    }

    public function update(Student $student, array $data): Student
    {
        DB::transaction(function () use ($student, $data) {
            $student->fill(collect($data)->only([
                'date_of_birth', 'gender', 'religion', 'state_of_origin', 'lga',
                'address', 'guardian_name', 'guardian_phone', 'guardian_email',
                'guardian_relationship', 'blood_group', 'admitted_on', 'status',
            ])->toArray())->save();

            if (! empty($data['name']) && $student->user) {
                $student->user->update(['name' => $data['name']]);
            }

            if (! empty($data['school_class_id']) && ! empty($data['arm_id'])) {
                StudentClass::updateOrCreate(
                    [
                        'student_id' => $student->id,
                        'school_class_id' => $data['school_class_id'],
                        'session_year' => $data['session_year'] ?? $this->defaultSessionYear(),
                        'term' => $data['term'] ?? 'first',
                    ],
                    [
                        'tenant_id' => $student->tenant_id,
                        'arm_id' => $data['arm_id'],
                        'status' => 'active',
                    ]
                );
            }
        });

        return $student->fresh(['user', 'enrollments.schoolClass', 'enrollments.arm']);
    }

    protected function provisionStudentUser(
        School $school,
        string $name,
        ?string $email,
        ?string $admissionNumber
    ): User {
        $email = $email ?: $this->placeholderEmail($school, $admissionNumber);

        return User::create([
            'tenant_id' => $school->id,
            'name' => $name,
            'email' => $email,
            'role' => User::ROLE_STUDENT,
            'password' => Str::random(20),
            'is_active' => true,
        ]);
    }

    protected function placeholderEmail(School $school, ?string $admissionNumber): string
    {
        $local = Str::lower($admissionNumber ?: Str::random(8));
        $local = preg_replace('/[^a-z0-9\-]/', '', $local) ?: Str::random(8);

        return "{$local}@students.{$school->slug}.local";
    }

    protected function defaultSessionYear(): string
    {
        $year = (int) now()->year;
        $month = (int) now()->month;
        // Nigerian academic session typically starts in September.
        $start = $month >= 9 ? $year : $year - 1;
        return $start.'/'.($start + 1);
    }
}
