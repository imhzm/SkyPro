<?php
// auth/jwt-helper.php - Lightweight JWT implementation (no external dependencies)

class JWT {
    private static $secret;

    public static function init($secret) {
        self::$secret = $secret;
    }

    public static function encode($payload, $expirySeconds = 86400) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['iat'] = time();
        $payload['exp'] = time() + $expirySeconds;
        $payload['jti'] = bin2hex(random_bytes(16));

        $base64Header = self::base64UrlEncode($header);
        $base64Payload = self::base64UrlEncode(json_encode($payload));
        $signature = hash_hmac('sha256', $base64Header . '.' . $base64Payload, self::$secret, true);
        $base64Signature = self::base64UrlEncode($signature);

        return $base64Header . '.' . $base64Payload . '.' . $base64Signature;
    }

    public static function decode($token) {
        if (self::$secret === null || self::$secret === '') return null;

        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        $header = json_decode(self::base64UrlDecode($parts[0]), true);
        $payload = json_decode(self::base64UrlDecode($parts[1]), true);
        $signature = self::base64UrlDecode($parts[2]);

        if (!$header || !$payload) return null;

        if (!isset($header['alg']) || $header['alg'] !== 'HS256') return null;

        $expectedSig = hash_hmac('sha256', $parts[0] . '.' . $parts[1], self::$secret, true);
        if (!hash_equals($signature, $expectedSig)) return null;

        if (isset($payload['nbf']) && $payload['nbf'] > time()) return null;
        if (isset($payload['exp']) && $payload['exp'] < time()) return null;

        return $payload;
    }

    public static function getBearerToken() {
        $headers = null;
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            if (isset($requestHeaders['Authorization'])) {
                $headers = $requestHeaders['Authorization'];
            }
        }
        if ($headers && preg_match('/Bearer\s+(.*)$/i', $headers, $matches)) {
            return $matches[1];
        }
        return null;
    }

    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
