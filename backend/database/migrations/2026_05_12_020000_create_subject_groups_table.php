<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Subject groupings (Core, Sciences, Arts, Commercial, Vocational, …).
     * Used purely for report-card layout and reporting; does NOT affect score
     * entry or grading.
     */
    public function up(): void
    {
        Schema::create('subject_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('description', 255)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['tenant_id', 'name'], 'subject_groups_tenant_name_unique');
            $table->index(['tenant_id', 'sort_order']);
        });

        Schema::create('subject_group_subject', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('subject_group_id')->constrained('subject_groups')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(
                ['subject_group_id', 'subject_id'],
                'subject_group_subject_unique',
            );
            $table->index(['tenant_id', 'subject_group_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subject_group_subject');
        Schema::dropIfExists('subject_groups');
    }
};
