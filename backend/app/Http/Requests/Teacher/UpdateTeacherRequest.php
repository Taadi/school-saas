<?php

namespace App\Http\Requests\Teacher;

use App\Models\Teacher;
use App\Support\NigerianStates;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTeacherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],

            'qualification' => ['nullable', 'string', 'max:255'],
            'years_of_experience' => ['nullable', 'integer', 'min:0', 'max:80'],
            'subject_specialization' => ['nullable', 'string', 'max:255'],

            'date_employed' => ['nullable', 'date'],
            'salary_amount' => ['nullable', 'numeric', 'min:0'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'account_number' => ['nullable', 'string', 'max:20'],
            'account_name' => ['nullable', 'string', 'max:120'],

            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', Rule::in(['male', 'female'])],
            'marital_status' => ['nullable', 'string', 'max:30'],
            'phone_secondary' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'state_of_origin' => ['nullable', Rule::in(NigerianStates::all())],
            'lga' => ['nullable', 'string', 'max:100'],

            'next_of_kin_name' => ['nullable', 'string', 'max:255'],
            'next_of_kin_phone' => ['nullable', 'string', 'max:30'],
            'next_of_kin_relationship' => ['nullable', 'string', 'max:50'],

            'passport_photo' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(Teacher::STATUSES)],
        ];
    }
}
