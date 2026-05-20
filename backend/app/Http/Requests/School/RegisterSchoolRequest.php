<?php

namespace App\Http\Requests\School;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterSchoolRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Public endpoint — anyone can submit a registration request,
        // but the actual creation is performed by Super Admin (or
        // bypass for self-service trials, depending on business rules).
        return true;
    }

    public function rules(): array
    {
        return [
            'school' => ['required', 'array'],
            'school.name' => ['required', 'string', 'max:255'],
            'school.email' => ['required', 'email', 'unique:schools,email'],
            'school.phone' => ['nullable', 'string', 'max:20'],
            'school.address' => ['nullable', 'string', 'max:255'],
            'school.city' => ['nullable', 'string', 'max:100'],
            'school.state' => ['nullable', 'string', 'max:100'],
            'school.motto' => ['nullable', 'string', 'max:255'],

            'admin' => ['required', 'array'],
            'admin.name' => ['required', 'string', 'max:255'],
            'admin.email' => ['required', 'email'],
            'admin.phone' => ['nullable', 'string', 'max:20'],
            'admin.password' => ['required', 'confirmed', Password::min(8)],
        ];
    }
}
