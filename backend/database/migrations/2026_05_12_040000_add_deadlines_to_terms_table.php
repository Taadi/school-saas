<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds workflow deadlines to each term. Score entry past the entry deadline
     * is blocked at the API layer (admin overrides allowed). Approval deadline
     * is informational on dashboards.
     */
    public function up(): void
    {
        Schema::table('terms', function (Blueprint $table) {
            $table->date('result_entry_deadline')->nullable()->after('end_date');
            $table->date('result_approval_deadline')->nullable()->after('result_entry_deadline');
        });
    }

    public function down(): void
    {
        Schema::table('terms', function (Blueprint $table) {
            $table->dropColumn(['result_entry_deadline', 'result_approval_deadline']);
        });
    }
};
