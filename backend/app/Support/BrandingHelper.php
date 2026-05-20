<?php

namespace App\Support;

use App\Models\PlatformSetting;
use App\Models\School;
use Illuminate\Support\Facades\Storage;

class BrandingHelper
{
    public static function storageUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }

    public static function platformLogoPath(?PlatformSetting $row = null): ?string
    {
        $row ??= PlatformSetting::singleton();
        $path = $row->data['logo_path'] ?? null;

        return is_string($path) && $path !== '' ? $path : null;
    }

    public static function platformLogoUrl(?PlatformSetting $row = null): ?string
    {
        return self::storageUrl(self::platformLogoPath($row));
    }

    public static function schoolLogoUrl(?School $school): ?string
    {
        if (! $school) {
            return null;
        }

        return self::storageUrl($school->logo_path);
    }

    /**
     * App shell logo: school overrides platform when set.
     */
    public static function effectiveLogoUrl(?School $school, ?PlatformSetting $row = null): ?string
    {
        return self::schoolLogoUrl($school) ?? self::platformLogoUrl($row);
    }
}
