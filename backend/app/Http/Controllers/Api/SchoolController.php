<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SchoolController extends Controller
{
    /**
     * Super Admin: list every registered school in the system.
     * Supports `search`, `status` and `expiring_soon` query filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = School::query()
            ->withCount(['users', 'students', 'classes'])
            ->latest();

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('subscription_status', $status);
        }

        if ($request->boolean('expiring_soon')) {
            $query->whereDate('subscription_expires_at', '<=', now()->addDays(14));
        }

        return response()->json($query->paginate((int) $request->input('per_page', 20)));
    }

    /**
     * Super Admin: detailed school profile with admins + key counts.
     */
    public function show(School $school): JsonResponse
    {
        $school->loadCount(['users', 'students', 'classes']);

        $admins = $school->admins()
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone', 'is_active', 'created_at']);

        $teachersCount = User::query()->withoutGlobalScopes()
            ->where('tenant_id', $school->id)
            ->where('role', User::ROLE_TEACHER)
            ->count();

        $totalCollected = (float) Payment::query()->withoutGlobalScopes()
            ->where('tenant_id', $school->id)->sum('amount');
        $totalBilled = (float) Invoice::query()->withoutGlobalScopes()
            ->where('tenant_id', $school->id)->sum('total_amount');

        return response()->json([
            'data' => $school,
            'admins' => $admins,
            'stats' => [
                'students' => $school->students_count,
                'teachers' => $teachersCount,
                'classes' => $school->classes_count,
                'admins' => $admins->count(),
                'total_billed' => round($totalBilled, 2),
                'total_collected' => round($totalCollected, 2),
            ],
        ]);
    }

    /**
     * Super Admin: update profile / subscription.
     */
    public function update(Request $request, School $school): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => [
                'sometimes', 'string', 'max:255',
                Rule::unique('schools', 'slug')->ignore($school->id),
            ],
            'email' => [
                'sometimes', 'email', 'max:255',
                Rule::unique('schools', 'email')->ignore($school->id),
            ],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'state' => ['sometimes', 'nullable', 'string', 'max:255'],
            'motto' => ['sometimes', 'nullable', 'string', 'max:255'],
            'subscription_status' => [
                'sometimes',
                Rule::in(['trial', 'active', 'suspended', 'cancelled']),
            ],
            'subscription_expires_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $school->update($data);

        return response()->json(['data' => $school->fresh()]);
    }

    /**
     * Super Admin: suspend / activate. Pass status as 'active' or 'suspended'.
     */
    public function setStatus(Request $request, School $school): JsonResponse
    {
        $data = $request->validate([
            'subscription_status' => ['required', Rule::in(['active', 'trial', 'suspended', 'cancelled'])],
        ]);

        $school->update(['subscription_status' => $data['subscription_status']]);

        return response()->json(['data' => $school->fresh()]);
    }

    /**
     * Super Admin: provision an additional school admin and return the
     * temporary password. Existing tenant data is untouched.
     */
    public function createAdmin(Request $request, School $school): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required', 'email', 'max:255',
                Rule::unique('users', 'email')->where(fn ($q) => $q->where('tenant_id', $school->id)),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $tempPassword = Str::random(10);

        $admin = new User([
            'tenant_id' => $school->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'role' => User::ROLE_SCHOOL_ADMIN,
            'password' => Hash::make($tempPassword),
            'is_active' => true,
        ]);
        $admin->save();

        return response()->json([
            'data' => $admin->only(['id', 'name', 'email', 'phone', 'role', 'is_active', 'created_at']),
            'temporary_password' => $tempPassword,
        ], 201);
    }

    /**
     * Super Admin: reset a school admin's password.
     */
    public function resetAdminPassword(School $school, User $user): JsonResponse
    {
        if ($user->tenant_id !== $school->id) {
            abort(404);
        }

        $tempPassword = Str::random(10);
        $user->update([
            'password' => Hash::make($tempPassword),
            'is_active' => true,
        ]);

        return response()->json([
            'data' => $user->only(['id', 'name', 'email']),
            'temporary_password' => $tempPassword,
        ]);
    }

    /**
     * Super Admin: soft-delete the school (keeps data via SoftDeletes).
     */
    public function destroy(School $school): JsonResponse
    {
        $school->delete();

        return response()->json(['message' => 'School archived.']);
    }

    /**
     * School Admin / Teacher: get the current tenant's profile + key counts.
     */
    public function current(): JsonResponse
    {
        $school = School::find(request()->user()->tenant_id);

        if (! $school) {
            return response()->json(['message' => 'School not found.'], 404);
        }

        return response()->json([
            'school' => $school,
            'stats' => [
                'students' => Student::count(),
                'teachers' => User::where('role', User::ROLE_TEACHER)->count(),
                'admins' => User::where('role', User::ROLE_SCHOOL_ADMIN)->count(),
            ],
        ]);
    }
}
