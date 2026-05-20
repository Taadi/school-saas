<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-tenant grading scales. A school can keep multiple (e.g. junior vs.
     * senior) and mark one as the default. Each scale has its bands in
     * `grading_bands` so we can render the legend on the report card and
     * auto-grade results without hardcoding the Nigerian scale in PHP.
     */
    public function up(): void
    {
        Schema::create('grading_scales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('description', 255)->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique(['tenant_id', 'name'], 'grading_scales_tenant_name_unique');
            $table->index(['tenant_id', 'is_default']);
        });

        Schema::create('grading_bands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('grading_scale_id')->constrained('grading_scales')->cascadeOnDelete();

            // Inclusive band: total >= min_score && total <= max_score
            $table->decimal('min_score', 6, 2);
            $table->decimal('max_score', 6, 2);
            $table->string('grade', 4);
            $table->decimal('grade_point', 4, 2)->nullable();
            $table->string('remark', 100)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['grading_scale_id', 'sort_order']);
            $table->index(['tenant_id', 'grading_scale_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grading_bands');
        Schema::dropIfExists('grading_scales');
    }
};
