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
use Illuminate\Validation\ValidationException;
use Throwable;

class BrandingController extends Controller
{
    /** Avoid Laravel's `image` rule — it requires the GD extension on the server. */
    private const LOGO_FILE_RULES = ['required', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:2048'];

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
        try {
            $request->validate(['file' => self::LOGO_FILE_RULES]);

            $row = PlatformSetting::singleton();
            $disk = Storage::disk('public');
            $disk->makeDirectory('platform/branding');

            $old = BrandingHelper::platformLogoPath($row);
            $path = $request->file('file')->store('platform/branding', 'public');

            if ($old && $disk->exists($old)) {
                $disk->delete($old);
            }

            $data = array_merge($row->data ?? [], ['logo_path' => $path]);
            $row->update(['data' => $data]);

            return response()->json([
                'logo_path' => $path,
                'logo_url' => BrandingHelper::storageUrl($path),
                'data' => $row->fresh()->data,
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => config('app.debug')
                    ? 'Logo upload failed: '.$e->getMessage()
                    : 'Logo upload failed. Check server storage permissions and run php artisan storage:link.',
            ], 500);
        }
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
        try {
            $request->validate(['file' => self::LOGO_FILE_RULES]);

            $school = $this->resolveSchool($request, true);
            $disk = Storage::disk('public');
            $dir = "tenants/{$school->id}/branding";
            $disk->makeDirectory($dir);

            $old = $school->logo_path;
            $path = $request->file('file')->store($dir, 'public');

            if ($old && $disk->exists($old)) {
                $disk->delete($old);
            }

            $school->update(['logo_path' => $path]);

            return response()->json([
                'logo_path' => $path,
                'logo_url' => BrandingHelper::storageUrl($path),
                'school' => $school->fresh(),
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => config('app.debug')
                    ? 'Logo upload failed: '.$e->getMessage()
                    : 'Logo upload failed. Check server storage permissions and run php artisan storage:link.',
            ], 500);
        }
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
