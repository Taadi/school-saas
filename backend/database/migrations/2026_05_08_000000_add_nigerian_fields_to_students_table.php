<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('religion', 50)->nullable()->after('gender');
            $table->string('state_of_origin', 100)->nullable()->after('religion');
            $table->string('lga', 100)->nullable()->after('state_of_origin');
            $table->string('guardian_email')->nullable()->after('guardian_phone');
            $table->string('guardian_relationship', 50)->nullable()->after('guardian_email');
            $table->string('photo_path')->nullable()->after('blood_group');
            $table->enum('status', ['active', 'graduated', 'transferred', 'withdrawn'])
                ->default('active')
                ->after('admitted_on');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'religion',
                'state_of_origin',
                'lga',
                'guardian_email',
                'guardian_relationship',
                'photo_path',
                'status',
            ]);
        });
    }
};
