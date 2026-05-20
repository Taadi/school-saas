<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('results', 'sub_term_id')) {
            Schema::table('results', function (Blueprint $table) {
                $table->foreignId('sub_term_id')->nullable()->after('term_id')
                    ->constrained('sub_terms')->nullOnDelete();
            });
        }

        $hasNewUnique = collect(DB::select(
            "SHOW INDEX FROM results WHERE Key_name = 'results_student_subject_term_subterm_unique'",
        ))->isNotEmpty();

        if ($hasNewUnique) {
            return;
        }

        $hasStudentIndex = collect(DB::select(
            "SHOW INDEX FROM results WHERE Key_name = 'results_student_id_index'",
        ))->isNotEmpty();

        if (! $hasStudentIndex) {
            Schema::table('results', function (Blueprint $table) {
                $table->index('student_id', 'results_student_id_index');
            });
        }

        DB::statement('ALTER TABLE results DROP INDEX results_student_subject_term_unique');
        DB::statement(
            'ALTER TABLE results ADD UNIQUE results_student_subject_term_subterm_unique (student_id, subject_id, term_id, sub_term_id)',
        );
    }

    public function down(): void
    {
        if (collect(DB::select(
            "SHOW INDEX FROM results WHERE Key_name = 'results_student_subject_term_subterm_unique'",
        ))->isNotEmpty()) {
            DB::statement('ALTER TABLE results DROP INDEX results_student_subject_term_subterm_unique');
        }

        if (! collect(DB::select(
            "SHOW INDEX FROM results WHERE Key_name = 'results_student_subject_term_unique'",
        ))->isNotEmpty()) {
            DB::statement(
                'ALTER TABLE results ADD UNIQUE results_student_subject_term_unique (student_id, subject_id, term_id)',
            );
        }

        Schema::table('results', function (Blueprint $table) {
            if (Schema::hasColumn('results', 'sub_term_id')) {
                $table->dropForeign(['sub_term_id']);
                $table->dropColumn('sub_term_id');
            }
            try {
                $table->dropIndex('results_student_id_index');
            } catch (\Throwable) {
            }
        });
    }
};
