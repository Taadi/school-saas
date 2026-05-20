<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stamp the scheme + scale that were in force when the result was first
     * saved, so that historical report cards remain renderable verbatim even
     * if the school later edits its scheme. `scores` is the dynamic per-
     * component breakdown keyed by `assessment_components.code`. The legacy
     * fixed columns (ca1/ca2/midterm/exam) stay for now and are auto-migrated
     * into `scores` whenever a row is read or written; they will be dropped in
     * a future cleanup migration once the UI no longer depends on them.
     */
    public function up(): void
    {
        Schema::table('results', function (Blueprint $table) {
            $table->foreignId('assessment_scheme_id')->nullable()
                ->after('term_id')
                ->constrained('assessment_schemes')->nullOnDelete();
            $table->foreignId('grading_scale_id')->nullable()
                ->after('assessment_scheme_id')
                ->constrained('grading_scales')->nullOnDelete();
            $table->json('scores')->nullable()->after('grading_scale_id');
        });
    }

    public function down(): void
    {
        Schema::table('results', function (Blueprint $table) {
            $table->dropForeign(['assessment_scheme_id']);
            $table->dropForeign(['grading_scale_id']);
            $table->dropColumn(['assessment_scheme_id', 'grading_scale_id', 'scores']);
        });
    }
};
