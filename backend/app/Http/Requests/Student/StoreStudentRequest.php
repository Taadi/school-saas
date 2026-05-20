<?php

namespace App\Http\Requests\Student;

use App\Support\NigerianStates;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'admission_number' => ['nullable', 'string', 'max:50'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', Rule::in(['male', 'female'])],
            'religion' => ['nullable', 'string', 'max:50'],
            'state_of_origin' => ['nullable', Rule::in(NigerianStates::all())],
            'lga' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'max:20'],
            'guardian_email' => ['nullable', 'email', 'max:255'],
            'guardian_relationship' => ['nullable', 'string', 'max:50'],
            'blood_group' => ['nullable', 'string', 'max:5'],
            'admitted_on' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['active', 'graduated', 'transferred', 'withdrawn'])],

            'school_class_id' => ['nullable', 'integer', 'exists:school_classes,id'],
            'arm_id' => ['nullable', 'integer', 'exists:arms,id', 'required_with:school_class_id'],
            'session_year' => ['nullable', 'string', 'max:9'],
            'term' => ['nullable', Rule::in(['first', 'second', 'third'])],
        ];
    }
}
