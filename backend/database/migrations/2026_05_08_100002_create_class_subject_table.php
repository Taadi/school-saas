<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_subject', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('school_class_id')->constrained('school_classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->boolean('is_compulsory')->default(true);
            $table->timestamps();

            $table->unique(['school_class_id', 'subject_id']);
            $table->index(['tenant_id', 'school_class_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_subject');
    }
};
