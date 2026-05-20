<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_class', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('school_class_id')->constrained('school_classes')->cascadeOnDelete();
            $table->foreignId('arm_id')->constrained('arms')->cascadeOnDelete();
            $table->string('session_year', 9);
            $table->enum('term', ['first', 'second', 'third'])->default('first');
            $table->enum('status', ['active', 'promoted', 'graduated', 'withdrawn'])->default('active');
            $table->timestamps();

            $table->unique(['student_id', 'school_class_id', 'session_year', 'term'], 'student_class_unique');
            $table->index(['tenant_id', 'session_year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_class');
    }
};
