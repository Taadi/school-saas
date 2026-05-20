<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teachers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->string('staff_id', 50);
            $table->string('qualification')->nullable();
            $table->unsignedTinyInteger('years_of_experience')->nullable();
            $table->string('subject_specialization')->nullable();

            $table->date('date_employed')->nullable();
            $table->decimal('salary_amount', 12, 2)->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_number', 20)->nullable();
            $table->string('account_name')->nullable();

            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female'])->nullable();
            $table->string('marital_status', 30)->nullable();
            $table->string('phone_secondary', 30)->nullable();
            $table->string('address')->nullable();
            $table->string('state_of_origin', 50)->nullable();
            $table->string('lga', 100)->nullable();

            $table->string('next_of_kin_name')->nullable();
            $table->string('next_of_kin_phone', 30)->nullable();
            $table->string('next_of_kin_relationship', 50)->nullable();

            $table->string('passport_photo')->nullable();

            $table->enum('status', ['active', 'on_leave', 'resigned'])
                ->default('active');

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'staff_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teachers');
    }
};
