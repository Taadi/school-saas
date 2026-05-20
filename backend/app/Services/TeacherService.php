<?php

namespace App\Services;

use App\Models\School;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TeacherService
{
    /**
     * Generate the next staff id for a school.
     *
     * Format: TCH-{YEAR}-{SEQUENCE} (e.g. TCH-2026-001).
     */
    public function generateStaffId(School $school, ?int $year = null): string
    {
        $year ??= (int) now()->year;
        $base = "TCH-{$year}-";

        $last = Teacher::query()
            ->withoutTenant()
            ->where('tenant_id', $school->id)
            ->where('staff_id', 'like', $base.'%')
            ->orderByDesc('id')
            ->value('staff_id');

        $next = 1;
        if ($last && preg_match('/-(\d+)$/', $last, $m)) {
            $next = ((int) $m[1]) + 1;
        }

        return $base.str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Create a Teacher inside a transaction. Auto-creates a linked User
     * (role = teacher) with a temporary password unless `user_id` is supplied.
     *
     * Returns the teacher plus a `temporary_password` attribute on the model
     * the very first time we provision a new login (so the controller can
     * surface it once to the admin who needs to share it).
     *
     * @param  array<string, mixed>  $data
     */
    public function create(School $school, array $data): Teacher
    {
        return DB::transaction(function () use ($school, $data) {
            $staffId = $data['staff_id'] ?? $this->generateStaffId($school);

            $userId = $data['user_id'] ?? null;
            $tempPassword = null;

            if (! $userId) {
                $tempPassword = $this->generateTempPassword();
                $user = $this->provisionTeacherUser(
                    school:       $school,
                    name:         (string) $data['name'],
                    email:        $data['email'] ?? null,
                    phone:        $data['phone'] ?? null,
                    plainPassword: $tempPassword,
                    staffId:      $staffId,
                );
                $userId = $user->id;
            }

            /** @var Teacher $teacher */
            $teacher = Teacher::create([
                'tenant_id' => $school->id,
                'user_id' => $userId,
                'staff_id' => $staffId,
                'qualification' => $data['qualification'] ?? null,
                'years_of_experience' => $data['years_of_experience'] ?? null,
                'subject_specialization' => $data['subject_specialization'] ?? null,
                'date_employed' => $data['date_employed'] ?? now()->toDateString(),
                'salary_amount' => $data['salary_amount'] ?? null,
                'bank_name' => $data['bank_name'] ?? null,
                'account_number' => $data['account_number'] ?? null,
                'account_name' => $data['account_name'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'gender' => $data['gender'] ?? null,
                'marital_status' => $data['marital_status'] ?? null,
                'phone_secondary' => $data['phone_secondary'] ?? null,
                'address' => $data['address'] ?? null,
                'state_of_origin' => $data['state_of_origin'] ?? null,
                'lga' => $data['lga'] ?? null,
                'next_of_kin_name' => $data['next_of_kin_name'] ?? null,
                'next_of_kin_phone' => $data['next_of_kin_phone'] ?? null,
                'next_of_kin_relationship' => $data['next_of_kin_relationship'] ?? null,
                'passport_photo' => $data['passport_photo'] ?? null,
                'status' => $data['status'] ?? Teacher::STATUS_ACTIVE,
            ]);

            $fresh = $teacher->fresh('user');

            // Surface the temp password to the controller (not persisted) on
            // the model the controller will hand off to the resource.
            if ($tempPassword && $fresh) {
                $fresh->setAttribute('temporary_password', $tempPassword);
            }

            return $fresh ?? $teacher;
        });
    }

    /**
     * Update a Teacher and (optionally) sync linked user fields like name/email/phone.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Teacher $teacher, array $data): Teacher
    {
        DB::transaction(function () use ($teacher, $data) {
            $teacher->fill(collect($data)->only([
                'qualification', 'years_of_experience', 'subject_specialization',
                'date_employed', 'salary_amount', 'bank_name', 'account_number',
                'account_name', 'date_of_birth', 'gender', 'marital_status',
                'phone_secondary', 'address', 'state_of_origin', 'lga',
                'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship',
                'passport_photo', 'status',
            ])->toArray())->save();

            if ($teacher->user) {
                $userPayload = collect($data)
                    ->only(['name', 'email', 'phone'])
                    ->filter(fn ($v) => $v !== null && $v !== '')
                    ->toArray();

                if (! empty($userPayload)) {
                    $teacher->user->fill($userPayload)->save();
                }

                // Active/Resigned should toggle the user's ability to log in.
                if (array_key_exists('status', $data)) {
                    $teacher->user->update([
                        'is_active' => $data['status'] !== Teacher::STATUS_RESIGNED,
                    ]);
                }
            }
        });

        return $teacher->fresh('user');
    }

    protected function provisionTeacherUser(
        School $school,
        string $name,
        ?string $email,
        ?string $phone,
        string $plainPassword,
        string $staffId,
    ): User {
        $email = $email ?: $this->placeholderEmail($school, $staffId);

        return User::create([
            'tenant_id' => $school->id,
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'role' => User::ROLE_TEACHER,
            'password' => Hash::make($plainPassword),
            'is_active' => true,
        ]);
    }

    protected function placeholderEmail(School $school, string $staffId): string
    {
        $local = Str::lower($staffId);
        $local = preg_replace('/[^a-z0-9\-]/', '', $local) ?: Str::random(8);

        return "{$local}@teachers.{$school->slug}.local";
    }

    /**
     * Generate a friendly 10-char temporary password (no ambiguous chars).
     */
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
