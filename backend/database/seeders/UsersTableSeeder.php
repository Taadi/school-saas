<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UsersTableSeeder extends Seeder
{
    public function run()
    {
        $users = [
            [
                'id' => 1,
                'tenant_id' => null,
                'name' => 'Super Admin',
                'email' => 'superadmin@school-saas.test',
                'phone' => '08068245229',
                'role' => 'super_admin',
                'email_verified_at' => '2026-05-08 15:42:43',
                'password' => '$2y$12$CkzBsLeGM6UjK/xiAbTA..mBnvxFTV7jgd2P1JjFZ6vKwKhIz.i6C',
                'is_active' => 1,
                'remember_token' => null,
                'created_at' => '2026-05-08 15:42:43',
                'updated_at' => '2026-05-11 09:52:09',
                'deleted_at' => null
            ],
            [
                'id' => 2,
                'tenant_id' => 1,
                'name' => 'Test Admin',
                'email' => 'admin@ng-test.test',
                'phone' => null,
                'role' => 'school_admin',
                'email_verified_at' => null,
                'password' => '$2y$12$jdkOwv9By0pobiCDTnLlYenK6CCqYYF7uTNAYgssQP2nD.hpc8EHy',
                'is_active' => 1,
                'remember_token' => null,
                'created_at' => '2026-05-08 16:04:36',
                'updated_at' => '2026-05-08 16:04:36',
                'deleted_at' => null
            ],
            [
                'id' => 3,
                'tenant_id' => 1,
                'name' => 'Adaeze Okafor',
                'email' => 'atijao9w@students.test-academy-ng.local',
                'phone' => null,
                'role' => 'student',
                'email_verified_at' => null,
                'password' => '$2y$12$z4vytWIWknZbtUDBwGz3Q.0z7nA7DNAzf9UtMwS9xqXyAiMaIVlTC',
                'is_active' => 1,
                'remember_token' => null,
                'created_at' => '2026-05-08 16:04:37',
                'updated_at' => '2026-05-08 16:04:37',
                'deleted_at' => null
            ],
            // Continue for the remaining users from your SQL...
        ];

        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['email' => $user['email']],
                $user
            );
        }
    }
}