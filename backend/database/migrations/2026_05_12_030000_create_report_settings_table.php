<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-tenant singleton holding everything that is too unstructured to put
     * in its own table:
     *
     *  - presentation flags (show position / class average / cumulative…)
     *  - cumulative rules (term-only vs. weighted average across terms)
     *  - attendance settings (enabled, calculation method)
     *  - non-assessment rating categories + scale (Conduct, Punctuality, …)
     *  - default comment banks per grade or per non-assessment trait
     *  - branding (motto, seal path, sponsor name, signatures)
     *
     * All read/write goes through ReportSettingsService::get($tenantId) which
     * deep-merges with sensible defaults so the UI never sees nulls.
     */
    public function up(): void
    {
        Schema::create('report_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->json('data')->nullable();
            $table->timestamps();

            $table->unique('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_settings');
    }
};
