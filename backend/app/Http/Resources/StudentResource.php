<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    public function toArray($request): array
    {
        $current = $this->whenLoaded('enrollments', function () {
            return $this->enrollments->sortByDesc('id')->first();
        });

        return [
            'id' => $this->id,
            'admission_number' => $this->admission_number,
            'name' => $this->user?->name,
            'email' => $this->user?->email,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'gender' => $this->gender,
            'religion' => $this->religion,
            'state_of_origin' => $this->state_of_origin,
            'lga' => $this->lga,
            'address' => $this->address,
            'guardian_name' => $this->guardian_name,
            'guardian_phone' => $this->guardian_phone,
            'guardian_email' => $this->guardian_email,
            'guardian_relationship' => $this->guardian_relationship,
            'blood_group' => $this->blood_group,
            'photo_path' => $this->photo_path,
            'admitted_on' => $this->admitted_on?->toDateString(),
            'status' => $this->status,
            'created_at' => $this->created_at?->toIso8601String(),

            'current_class' => $current ? [
                'school_class_id' => $current->school_class_id,
                'school_class_name' => $current->relationLoaded('schoolClass')
                    ? $current->schoolClass?->name
                    : null,
                'arm_id' => $current->arm_id,
                'arm_name' => $current->relationLoaded('arm') ? $current->arm?->name : null,
                'session_year' => $current->session_year,
                'term' => $current->term,
            ] : null,
        ];
    }
}
