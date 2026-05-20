<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TeacherResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'staff_id' => $this->staff_id,
            'name' => $this->user?->name,
            'email' => $this->user?->email,
            'phone' => $this->user?->phone,
            'is_active' => (bool) ($this->user?->is_active ?? true),

            'qualification' => $this->qualification,
            'years_of_experience' => $this->years_of_experience,
            'subject_specialization' => $this->subject_specialization,

            'date_employed' => $this->date_employed?->toDateString(),
            'salary_amount' => $this->salary_amount !== null
                ? (float) $this->salary_amount
                : null,
            'bank_name' => $this->bank_name,
            'account_number' => $this->account_number,
            'account_name' => $this->account_name,

            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'gender' => $this->gender,
            'marital_status' => $this->marital_status,
            'phone_secondary' => $this->phone_secondary,
            'address' => $this->address,
            'state_of_origin' => $this->state_of_origin,
            'lga' => $this->lga,

            'next_of_kin_name' => $this->next_of_kin_name,
            'next_of_kin_phone' => $this->next_of_kin_phone,
            'next_of_kin_relationship' => $this->next_of_kin_relationship,

            'passport_photo' => $this->passport_photo,
            'status' => $this->status,

            'created_at' => $this->created_at?->toIso8601String(),

            // Surfaced by TeacherService::create() the first time we provision
            // a login. Never present on subsequent reads.
            'temporary_password' => $this->resource->getAttribute('temporary_password'),
        ];
    }
}
