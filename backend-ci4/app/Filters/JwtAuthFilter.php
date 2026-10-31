<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $header = $request->getHeaderLine('Authorization');
        if (empty($header) || !str_starts_with($header, 'Bearer ')) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['error' => 'Authentication required']);
        }

        $token = substr($header, 7);
        $secret = getenv('JWT_SECRET') ?: 'trimplate_dev_secret_change_in_prod';

        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            $request->user = $decoded;

            if (!empty($arguments) && in_array('admin', $arguments, true)) {
                if (($decoded->role ?? '') !== 'admin') {
                    return service('response')
                        ->setStatusCode(403)
                        ->setJSON(['error' => 'Admin access required']);
                }
            }
        } catch (\Throwable $e) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['error' => 'Invalid or expired token']);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
