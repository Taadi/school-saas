<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Issue a Sanctum token for the given credentials.
     *
     * `school_slug` is optional but recommended for non-super-admin users
     * since email uniqueness is scoped per tenant.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $query = User::query()->withoutTenant()->where('email', $data['email']);

        if (! empty($data['school_slug'])) {
            $school = School::where('slug', $data['school_slug'])->first();

            if (! $school) {
                throw ValidationException::withMessages([
                    'school_slug' => ['School not found.'],
                ]);
            }

            $query->where('tenant_id', $school->id);
        }

        $user = $query->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Account is deactivated.'],
            ]);
        }

        $token = $user->createToken('api', [$user->role])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->only([
                'id', 'name', 'email', 'phone', 'role', 'tenant_id',
            ]),
            'school' => $user->school?->only(['id', 'name', 'slug']),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('school:id,name,slug');

        return response()->json(['user' => $user]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}
