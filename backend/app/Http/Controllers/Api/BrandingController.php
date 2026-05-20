<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\School;
use App\Models\User;
use App\Support\BrandingHelper;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BrandingController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $platform = PlatformSetting::singleton();
        $platformUrl = BrandingHelper::platformLogoUrl($platform);

        $school = $this->resolveSchool($request, false);
        $schoolUrl = BrandingHelper::schoolLogoUrl($school);

        $effective = $school
            ? BrandingHelper::effectiveLogoUrl($school, $platform)
            : $platformUrl;

        return response()->json([
            'platform_logo_url' => $platformUrl,
            'school_logo_url' => $schoolUrl,
            'effective_logo_url' => $effective,
            'can_edit_platform' => $user->isSuperAdmin(),
            'can_edit_school' => $user->role === User::ROLE_SCHOOL_ADMIN
                || ($user->isSuperAdmin() && $school !== null),
        ]);
    }

    public function uploadPlatformLogo(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'image', 'max:2048'],
        ]);

        $row = PlatformSetting::singleton();
        $disk = Storage::disk('public');
        $old = BrandingHelper::platformLogoPath($row);

        $path = $request->file('file')->store('platform/branding', 'public');

        if ($old && $disk->exists($old)) {
            $disk->delete($old);
        }

        $data = array_merge($row->data ?? [], ['logo_path' => $path]);
        $row->update(['data' => $data]);

        $url = BrandingHelper::storageUrl($path);

        return response()->json([
            'logo_path' => $path,
            'logo_url' => $url,
            'data' => $row->fresh()->data,
        ]);
    }

    public function removePlatformLogo(): JsonResponse
    {
        $row = PlatformSetting::singleton();
        $disk = Storage::disk('public');
        $old = BrandingHelper::platformLogoPath($row);

        if ($old && $disk->exists($old)) {
            $disk->delete($old);
        }

        $data = $row->data ?? [];
        unset($data['logo_path']);
        $row->update(['data' => $data]);

        return response()->json(['data' => $row->fresh()->data]);
    }

    public function uploadSchoolLogo(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'image', 'max:2048'],
        ]);

        $school = $this->resolveSchool($request, true);
        $disk = Storage::disk('public');
        $old = $school->logo_path;

        $path = $request->file('file')->store(
            "tenants/{$school->id}/branding",
            'public',
        );

        if ($old && $disk->exists($old)) {
            $disk->delete($old);
        }

        $school->update(['logo_path' => $path]);

        $url = BrandingHelper::storageUrl($path);

        return response()->json([
            'logo_path' => $path,
            'logo_url' => $url,
            'school' => $school->fresh(),
        ]);
    }

    public function removeSchoolLogo(Request $request): JsonResponse
    {
        $school = $this->resolveSchool($request, true);
        $disk = Storage::disk('public');

        if ($school->logo_path && $disk->exists($school->logo_path)) {
            $disk->delete($school->logo_path);
        }

        $school->update(['logo_path' => null]);

        return response()->json(['school' => $school->fresh()]);
    }

    protected function resolveSchool(Request $request, bool $required): ?School
    {
        $tenantId = app(TenantContext::class)->id()
            ?? $request->user()->tenant_id;

        if (! $tenantId) {
            if ($required) {
                abort(403, 'Select a school to manage its branding.');
            }

            return null;
        }

        return School::query()->withoutGlobalScopes()->find($tenantId);
    }
}
