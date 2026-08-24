<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\RestRegistry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Generic REST resource controller. All requests pass through:
 *   - auth:sanctum + tenant.active (route group)
 *   - RestRegistry whitelist (resource must be registered)
 *   - has_perm() permission check (module.view|create|edit|delete)
 *   - BelongsToTenant trait on each model (auto tenant scoping)
 */
class RestController extends Controller
{
    private const OPS = ['eq','neq','in','nin','like','ilike','gt','gte','lt','lte','null','notnull'];

    /** GET /api/rest/{resource} */
    public function index(Request $request, string $resource)
    {
        [$cfg, $modelClass] = $this->resolve($resource);
        $this->authorizeResource($request, $cfg);
        $this->authorizePerm($request, $cfg['module'], 'view');

        /** @var Builder $q */
        $q = $modelClass::query();
        $this->applyWith($q, $cfg, $request);
        $this->applyFilters($q, $cfg, $request);
        $this->applySearch($q, $cfg, $request);
        $this->applySort($q, $cfg, $request);

        $perPage = min(
            (int)($request->query('per_page', 50)),
            (int)($cfg['max_per_page'] ?? 200)
        );
        $perPage = max($perPage, 1);

        $paginator = $q->paginate($perPage);
        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'page'     => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total'    => $paginator->total(),
                'last_page'=> $paginator->lastPage(),
            ],
        ]);
    }

    /** GET /api/rest/{resource}/{id} */
    public function show(Request $request, string $resource, string $id)
    {
        [$cfg, $modelClass] = $this->resolve($resource);
        $this->authorizeResource($request, $cfg);
        $this->authorizePerm($request, $cfg['module'], 'view');

        $q = $modelClass::query();
        $this->applyWith($q, $cfg, $request);
        $row = $q->findOrFail($id);
        return response()->json($row);
    }

    /** POST /api/rest/{resource} */
    public function store(Request $request, string $resource)
    {
        [$cfg, $modelClass] = $this->resolve($resource);
        $this->authorizeResource($request, $cfg);
        $this->authorizePerm($request, $cfg['module'], 'create');

        $data = $request->all();
        // Drop guarded server-managed fields
        unset($data['id'], $data['created_at'], $data['updated_at']);

        /** @var Model $model */
        $model = new $modelClass();
        $model->fill($data);
        $model->save();
        return response()->json($model->refresh(), 201);
    }

    /** PATCH /api/rest/{resource}/{id} */
    public function update(Request $request, string $resource, string $id)
    {
        [$cfg, $modelClass] = $this->resolve($resource);
        $this->authorizeResource($request, $cfg);
        $this->authorizePerm($request, $cfg['module'], 'edit');

        $row = $modelClass::query()->findOrFail($id);
        $data = $request->all();
        unset($data['id'], $data['tenant_id'], $data['created_at'], $data['updated_at']);
        $row->fill($data);
        $row->save();
        return response()->json($row->refresh());
    }

    /** DELETE /api/rest/{resource}/{id} */
    public function destroy(Request $request, string $resource, string $id)
    {
        [$cfg, $modelClass] = $this->resolve($resource);
        $this->authorizeResource($request, $cfg);
        $this->authorizePerm($request, $cfg['module'], 'delete');

        $row = $modelClass::query()->findOrFail($id);
        $row->delete();
        return response()->json(['ok' => true]);
    }

    // ===== Helpers =====================================================

    /** @return array{0: array<string,mixed>, 1: class-string} */
    private function resolve(string $resource): array
    {
        $cfg = RestRegistry::get($resource);
        abort_unless($cfg, 404, "Unknown resource: {$resource}");
        $model = $cfg['model'];
        abort_unless(class_exists($model), 500, "Model not found for resource: {$resource}");
        return [$cfg, $model];
    }

    /**
     * Platform-level resources (provider API keys, gateway credentials) are
     * superadmin-only regardless of module permissions granted inside a tenant.
     */
    private function authorizeResource(Request $request, array $cfg): void
    {
        if (empty($cfg['superadmin'])) return;
        $user = $request->user();
        abort_unless($user, 401);
        abort_unless(
            method_exists($user, 'isSuperadmin') && $user->isSuperadmin(),
            403,
            'Forbidden: superadmin only'
        );
    }

    private function authorizePerm(Request $request, string $module, string $action): void
    {
        $user = $request->user();
        abort_unless($user, 401);
        // Superadmin bypass — matches User::canModule() / hasPerm() behavior and
        // keeps the controller portable across DB engines (the SQL helpers below
        // are Postgres-only).
        if (method_exists($user, 'isSuperadmin') && $user->isSuperadmin()) {
            return;
        }
        // Portable fallback for non-pgsql engines (sqlite test suite, ad-hoc
        // mysql installs). The Postgres helpers below don't exist there, so
        // we re-use the Eloquent equivalent on the User model which already
        // mirrors has_perm() semantics.
        if (DB::connection()->getDriverName() !== 'pgsql') {
            abort_unless(
                method_exists($user, 'canModule') && $user->canModule($module, $action),
                403,
                "Forbidden: {$module}.{$action}"
            );
            return;
        }
        // Re-use the existing SQL helper so policy stays in one place.
        $row = DB::selectOne('select public.has_perm(?, ?) as ok', [
            $user->id, "{$module}.{$action}",
        ]);
        // Also accept the broader module-level permission ("inventory.view") via the
        // legacy has_module_permission function used by the SPA.
        if (!($row->ok ?? false)) {
            $alt = DB::selectOne(
                'select public.has_module_permission(?, ?, ?) as ok',
                [$user->id, $module, $action]
            );
            abort_unless($alt->ok ?? false, 403, "Forbidden: {$module}.{$action}");
        }
    }

    private function applyWith(Builder $q, array $cfg, Request $request): void
    {
        $with = $request->query('with');
        if (!$with) return;
        $allowed = $cfg['with'] ?? [];
        $requested = array_filter(array_map('trim', explode(',', (string)$with)));
        $safe = array_values(array_intersect($requested, $allowed));
        if ($safe) $q->with($safe);
    }

    private function applyFilters(Builder $q, array $cfg, Request $request): void
    {
        $allowed = $cfg['filters'] ?? [];
        $filters = (array)$request->query('filter', []);
        foreach ($filters as $col => $val) {
            if (!in_array($col, $allowed, true)) continue;

            if (is_array($val)) {
                foreach ($val as $op => $v) {
                    if (!in_array($op, self::OPS, true)) continue;
                    $this->applyOp($q, $col, $op, $v);
                }
            } else {
                $this->applyOp($q, $col, 'eq', $val);
            }
        }
    }

    /**
     * MySQL/MariaDB has no ILIKE operator (its LIKE is already case-insensitive
     * for the default collations), so map ilike -> like outside Postgres.
     */
    private function likeOperator(Builder $q): string
    {
        $driver = $q->getModel()->getConnection()->getDriverName();
        return $driver === 'pgsql' ? 'ilike' : 'like';
    }

    private function applyOp(Builder $q, string $col, string $op, $val): void
    {
        switch ($op) {
            case 'eq':      $q->where($col, $val); break;
            case 'neq':     $q->where($col, '!=', $val); break;
            case 'in':      $q->whereIn($col, is_array($val) ? $val : explode(',', (string)$val)); break;
            case 'nin':     $q->whereNotIn($col, is_array($val) ? $val : explode(',', (string)$val)); break;
            case 'like':    $q->where($col, 'like', "%{$val}%"); break;
            case 'ilike':   $q->where($col, $this->likeOperator($q), "%{$val}%"); break;
            case 'gt':      $q->where($col, '>',  $val); break;
            case 'gte':     $q->where($col, '>=', $val); break;
            case 'lt':      $q->where($col, '<',  $val); break;
            case 'lte':     $q->where($col, '<=', $val); break;
            case 'null':    $q->whereNull($col); break;
            case 'notnull': $q->whereNotNull($col); break;
        }
    }

    private function applySearch(Builder $q, array $cfg, Request $request): void
    {
        $term = trim((string)$request->query('q', ''));
        if ($term === '') return;
        $cols = $cfg['search'] ?? [];
        if (!$cols) return;
        $like = $this->likeOperator($q);
        $q->where(function (Builder $sub) use ($cols, $term, $like) {
            foreach ($cols as $c) {
                $sub->orWhere($c, $like, "%{$term}%");
            }
        });
    }


    private function applySort(Builder $q, array $cfg, Request $request): void
    {
        $allowed = $cfg['sort'] ?? [];
        $sort = (string)$request->query('sort', $cfg['default_sort'] ?? '');
        if ($sort === '') return;
        foreach (explode(',', $sort) as $field) {
            $field = trim($field);
            if ($field === '') continue;
            $dir = 'asc';
            if ($field[0] === '-') { $dir = 'desc'; $field = substr($field, 1); }
            if (!in_array($field, $allowed, true)) continue;
            $q->orderBy($field, $dir);
        }
    }
}