<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessment_schemes', function (Blueprint $table) {
            if (! Schema::hasColumn('assessment_schemes', 'applies_to')) {
                $table->string('applies_to', 16)->default('term')->after('term_id');
            }
            if (! Schema::hasColumn('assessment_schemes', 'sub_term_id')) {
                $table->foreignId('sub_term_id')->nullable()->after('applies_to')
                    ->constrained('sub_terms')->nullOnDelete();
            }
        });

        $hasIndex = collect(DB::select(
            "SHOW INDEX FROM assessment_schemes WHERE Key_name = 'assessment_schemes_period_idx'",
        ))->isNotEmpty();

        if (! $hasIndex) {
            Schema::table('assessment_schemes', function (Blueprint $table) {
                $table->index(['tenant_id', 'term_id', 'applies_to', 'sub_term_id'], 'assessment_schemes_period_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::table('assessment_schemes', function (Blueprint $table) {
            $table->dropForeign(['sub_term_id']);
            $table->dropColumn(['applies_to', 'sub_term_id']);
        });
    }
};
