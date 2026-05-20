<?php

namespace App\Http\Requests\Student;

use App\Support\NigerianStates;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'date_of_birth' => ['sometimes', 'nullable', 'date', 'before:today'],
            'gender' => ['sometimes', 'nullable', Rule::in(['male', 'female'])],
            'religion' => ['sometimes', 'nullable', 'string', 'max:50'],
            'state_of_origin' => ['sometimes', 'nullable', Rule::in(NigerianStates::all())],
            'lga' => ['sometimes', 'nullable', 'string', 'max:100'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'guardian_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'guardian_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'guardian_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'guardian_relationship' => ['sometimes', 'nullable', 'string', 'max:50'],
            'blood_group' => ['sometimes', 'nullable', 'string', 'max:5'],
            'admitted_on' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', Rule::in(['active', 'graduated', 'transferred', 'withdrawn'])],

            'school_class_id' => ['sometimes', 'nullable', 'integer', 'exists:school_classes,id'],
            'arm_id' => ['sometimes', 'nullable', 'integer', 'exists:arms,id'],
            'session_year' => ['sometimes', 'nullable', 'string', 'max:9'],
            'term' => ['sometimes', 'nullable', Rule::in(['first', 'second', 'third'])],
        ];
    }
}
