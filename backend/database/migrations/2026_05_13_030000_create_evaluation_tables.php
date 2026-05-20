<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_rubrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('description', 255)->nullable();
            $table->string('cadence', 20)->default('weekly'); // weekly | biweekly | monthly | adhoc | term
            $table->string('scope', 20)->default('per_student');
            $table->string('target_role', 32)->default('form_teacher');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->index(['tenant_id', 'is_active']);
        });

        Schema::create('evaluation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('evaluation_rubric_id')->constrained('evaluation_rubrics')->cascadeOnDelete();
            $table->string('code', 48);
            $table->string('label', 150);
            $table->string('type', 24); // yes_no | scale_1_5 | scale_1_10 | choice | text
            $table->json('choices')->nullable();
            $table->decimal('weight', 6, 3)->default(1);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['evaluation_rubric_id', 'code'], 'evaluation_items_rubric_code_unique');
        });

        Schema::create('evaluation_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('evaluation_rubric_id')->constrained('evaluation_rubrics')->cascadeOnDelete();
            $table->foreignId('term_id')->constrained('terms')->cascadeOnDelete();
            $table->string('label', 80);
            $table->unsignedSmallInteger('ordinal')->default(1);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('locked')->default(false);
            $table->timestamps();
            $table->unique(['evaluation_rubric_id', 'term_id', 'ordinal'], 'evaluation_periods_rubric_term_ord_unique');
            $table->index(['tenant_id', 'term_id']);
        });

        Schema::create('evaluation_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('evaluation_rubric_id')->constrained('evaluation_rubrics')->cascadeOnDelete();
            $table->foreignId('evaluation_period_id')->constrained('evaluation_periods')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('arm_id')->nullable()->constrained('arms')->nullOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->decimal('overall_score', 6, 2)->nullable();
            $table->string('overall_remark', 255)->nullable();
            $table->enum('status', ['draft', 'submitted', 'approved'])->default('draft');
            $table->timestamps();
            $table->unique(
                ['evaluation_period_id', 'student_id'],
                'evaluation_responses_period_student_unique',
            );
            $table->index(['tenant_id', 'student_id']);
        });

        Schema::create('evaluation_response_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('evaluation_response_id')->constrained('evaluation_responses')->cascadeOnDelete();
            $table->foreignId('evaluation_item_id')->constrained('evaluation_items')->cascadeOnDelete();
            $table->decimal('value_numeric', 8, 2)->nullable();
            $table->string('value_text', 500)->nullable();
            $table->timestamps();
            $table->unique(
                ['evaluation_response_id', 'evaluation_item_id'],
                'evaluation_response_items_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_response_items');
        Schema::dropIfExists('evaluation_responses');
        Schema::dropIfExists('evaluation_periods');
        Schema::dropIfExists('evaluation_items');
        Schema::dropIfExists('evaluation_rubrics');
    }
};
