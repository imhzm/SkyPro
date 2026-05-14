<?php
// auth/rate-limit.php - Simple rate limiting

class RateLimit {
    private $pdo;
    private static $tableChecked = false;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    // Database-backed rate limiting (more reliable)
    public function check($identifier, $maxRequests = 10, $windowSeconds = 60) {
        if (!self::$tableChecked) {
            $this->pdo->exec("CREATE TABLE IF NOT EXISTS rate_limits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                identifier VARCHAR(255) NOT NULL,
                endpoint VARCHAR(100) NOT NULL,
                request_time INT NOT NULL,
                INDEX idx_identifier (identifier),
                INDEX idx_time (request_time)
            ) ENGINE=InnoDB");
            self::$tableChecked = true;
        }

        $now = time();
        $windowStart = $now - $windowSeconds;
        $endpoint = $_SERVER['SCRIPT_NAME'] ?? 'unknown';

        $this->pdo->beginTransaction();
        try {
            $cleanStmt = $this->pdo->prepare("DELETE FROM rate_limits WHERE request_time < ?");
            $cleanStmt->execute([$windowStart]);

            $countStmt = $this->pdo->prepare(
                "SELECT COUNT(*) as cnt FROM rate_limits WHERE identifier = ? AND endpoint = ? AND request_time >= ? LOCK IN SHARE MODE"
            );
            $countStmt->execute([$identifier, $endpoint, $windowStart]);
            $result = $countStmt->fetch();
            $count = $result['cnt'];

            if ($count >= $maxRequests) {
                $this->pdo->commit();
                return false;
            }

            $insertStmt = $this->pdo->prepare(
                "INSERT INTO rate_limits (identifier, endpoint, request_time) VALUES (?, ?, ?)"
            );
            $insertStmt->execute([$identifier, $endpoint, $now]);
            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return false;
        }
    }

    // Get client IP for rate limiting
    public static function getClientIP() {
        $trustProxyHeaders = strtolower(getenv('TRUST_PROXY_HEADERS') ?: 'false') === 'true';
        $ipKeys = $trustProxyHeaders
            ? ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR']
            : ['REMOTE_ADDR'];
        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = explode(',', $_SERVER[$key])[0];
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    // Validate device fingerprint format (SHA-256 hex or install-id hex)
    public static function isValidDeviceId($deviceId) {
        if (!is_string($deviceId) || strlen($deviceId) < 8 || strlen($deviceId) > 256) return false;
        return (bool) preg_match('/^[a-f0-9\-]{8,256}$/i', $deviceId);
    }
}
