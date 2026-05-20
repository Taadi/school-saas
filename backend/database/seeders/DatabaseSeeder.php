<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Super Admin — landlord. No tenant_id; spans all schools.
        User::query()->updateOrCreate(
            ['email' => 'superadmin@school-saas.test'],
            [
                'tenant_id' => null,
                'name' => 'Super Admin',
                'role' => User::ROLE_SUPER_ADMIN,
                'password' => 'password',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
    }
}
