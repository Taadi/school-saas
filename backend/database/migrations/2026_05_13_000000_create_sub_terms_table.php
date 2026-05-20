<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sub_terms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('term_id')->constrained('terms')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('kind', 32)->default('midterm'); // midterm | window | weekly | custom
            $table->unsignedSmallInteger('ordinal')->default(1);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['term_id', 'name'], 'sub_terms_term_name_unique');
            $table->index(['tenant_id', 'term_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sub_terms');
    }
};
