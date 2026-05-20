<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subject_teachers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('school_class_id')->constrained('school_classes')->cascadeOnDelete();
            $table->foreignId('arm_id')->constrained('arms')->cascadeOnDelete();
            // FK to users.id (the user must have role = teacher; enforced in validation,
            // matches the existing arms.class_teacher_id pattern).
            $table->foreignId('teacher_user_id')->constrained('users')->cascadeOnDelete();
            // Optional session scoping — null means "applies to current/any session".
            $table->foreignId('academic_session_id')->nullable()
                ->constrained('academic_sessions')->nullOnDelete();
            $table->boolean('is_lead')->default(true);
            $table->timestamps();

            // Allow co-teachers per arm/subject by including teacher_user_id, but
            // never duplicate the exact same assignment.
            $table->unique(
                ['subject_id', 'arm_id', 'academic_session_id', 'teacher_user_id'],
                'subject_teachers_unique_assignment',
            );
            $table->index(['tenant_id', 'subject_id']);
            $table->index(['tenant_id', 'teacher_user_id']);
            $table->index(['tenant_id', 'school_class_id', 'arm_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subject_teachers');
    }
};
