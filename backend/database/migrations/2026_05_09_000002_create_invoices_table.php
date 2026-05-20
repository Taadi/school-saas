<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('school_class_id')->constrained('school_classes')->cascadeOnDelete();
            $table->foreignId('arm_id')->nullable()->constrained('arms')->nullOnDelete();
            $table->foreignId('academic_session_id')->constrained('academic_sessions')->cascadeOnDelete();
            $table->foreignId('term_id')->constrained('terms')->cascadeOnDelete();

            $table->string('invoice_number', 30)->unique();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('balance', 12, 2)->default(0);
            $table->enum('status', ['pending', 'partial', 'paid'])->default('pending');
            $table->date('due_date')->nullable();
            $table->date('issued_on')->nullable();
            $table->string('notes')->nullable();
            $table->timestamps();

            // One invoice per student per term.
            $table->unique(['student_id', 'term_id'], 'invoices_student_term_unique');
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'term_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
