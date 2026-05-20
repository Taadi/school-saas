<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Assessment Scheme = the recipe for a result row. A school can keep
     * multiple schemes (one per session, optional override per term, optional
     * override per subject) and the active scheme decides which columns the
     * Score Entry page renders, what the maxima are, how scores combine into
     * the final total, and which grading scale lights up.
     *
     * Components live in `assessment_components`. `total_max` is the cached
     * sum of component maxima — reused for validation and progress UI.
     */
    public function up(): void
    {
        Schema::create('assessment_schemes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('description', 255)->nullable();

            // Scope of applicability — most schools use session-wide schemes.
            $table->foreignId('academic_session_id')->nullable()
                ->constrained('academic_sessions')->nullOnDelete();
            $table->foreignId('term_id')->nullable()
                ->constrained('terms')->nullOnDelete();

            $table->foreignId('grading_scale_id')->nullable()
                ->constrained('grading_scales')->nullOnDelete();

            $table->decimal('total_max', 6, 2)->default(100);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'name'], 'assessment_schemes_tenant_name_unique');
            $table->index(['tenant_id', 'is_default']);
            $table->index(['tenant_id', 'academic_session_id', 'term_id']);
        });

        Schema::create('assessment_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('assessment_scheme_id')->constrained('assessment_schemes')->cascadeOnDelete();

            // Stable machine code (e.g. "ca1", "exam"). Used as JSON key in
            // `results.scores` and on bulk-upsert payloads. Keep snake_case.
            $table->string('code', 32);
            $table->string('label', 100);
            $table->decimal('max_score', 6, 2);
            // Weight = multiplier applied to score before summing into total.
            // Default 1 = simple addition (CA1+CA2+...+Exam).
            $table->decimal('weight', 6, 3)->default(1);
            $table->boolean('is_exam')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(
                ['assessment_scheme_id', 'code'],
                'assessment_components_scheme_code_unique',
            );
            $table->index(['tenant_id', 'assessment_scheme_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_components');
        Schema::dropIfExists('assessment_schemes');
    }
};
