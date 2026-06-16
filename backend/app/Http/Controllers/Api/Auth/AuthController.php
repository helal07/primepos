<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * SPA cookie session login. Call /sanctum/csrf-cookie first.
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => ['required', 'string'],
            'password'   => ['required', 'string'],
            'remember'   => ['sometimes', 'boolean'],
        ]);

        $user = $this->resolveUser($data['identifier']);
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['Invalid credentials.'],
            ]);
        }

        if ($user->status === 'suspended') {
            throw ValidationException::withMessages([
                'identifier' => ['Account suspended.'],
            ]);
        }

        Auth::login($user, $data['remember'] ?? false);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json(['user' => $this->userPayload($user)]);
    }

    /**
     * Mobile / 3rd-party bearer token.
     */
    public function token(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier'  => ['required', 'string'],
            'password'    => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:120'],
        ]);

        $user = $this->resolveUser($data['identifier']);
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['Invalid credentials.'],
            ]);
        }

        $token = $user->createToken($data['device_name'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        if ($request->user()?->currentAccessToken()) {
            $request->user()->currentAccessToken()->delete();
        }

        Auth::guard('web')->logout();
        $request->session()?->invalidate();
        $request->session()?->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userPayload($request->user())]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:8'],
        ]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }
        $user->password = Hash::make($data['new_password']);
        $user->save();
        return response()->json(['ok' => true]);
    }

    private function resolveUser(string $identifier): ?User
    {
        return User::query()
            ->where('email', $identifier)
            ->orWhere('phone', $identifier)
            ->first();
    }

    private function userPayload(User $user): array
    {
        $user->load('tenant');
        return [
            'id'             => $user->id,
            'name'           => $user->name,
            'email'          => $user->email,
            'phone'          => $user->phone,
            'status'         => $user->status,
            'is_superadmin'  => $user->isSuperadmin(),
            'tenant_id'      => $user->tenant_id,
            'tenant'         => $user->tenant ? [
                'id'                => $user->tenant->id,
                'name'              => $user->tenant->name,
                'slug'              => $user->tenant->slug,
                'status'            => $user->tenant->status,
                'enabled_modules'   => $user->tenant->effectiveModules(),
                'trial_ends_at'     => $user->tenant->trial_ends_at?->toDateString(),
                'subscription_end'  => $user->tenant->subscription_end?->toDateString(),
            ] : null,
            'roles'          => $user->roleNames(),
        ];
    }
}