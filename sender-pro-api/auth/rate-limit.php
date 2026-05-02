<?php
// auth/rate-limit.php - Simple rate limiting

class RateLimit {
    private $pdo;
    private $cacheDir;

    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->cacheDir = dirname(__DIR__) . '/cache';
        if (!is_dir($this->cacheDir)) {
            @mkdir($this->cacheDir, 0755, true);
        }
    }

    // Database-backed rate limiting (more reliable)
    public function check($identifier, $maxRequests = 10, $windowSeconds = 60) {
        $tableCheck = $this->pdo->query("SHOW TABLES LIKE 'rate_limits'");
        if ($tableCheck->rowCount() === 0) {
            $this->pdo->exec("CREATE TABLE IF NOT EXISTS rate_limits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                identifier VARCHAR(255) NOT NULL,
                endpoint VARCHAR(100) NOT NULL,
                request_time INT NOT NULL,
                INDEX idx_identifier (identifier),
                INDEX idx_time (request_time)
            ) ENGINE=InnoDB");
        }

        $now = time();
        $windowStart = $now - $windowSeconds;

        // Clean old entries
        $cleanStmt = $this->pdo->prepare("DELETE FROM rate_limits WHERE request_time < ?");
        $cleanStmt->execute([$windowStart]);

        // Count requests in window
        $countStmt = $this->pdo->prepare(
            "SELECT COUNT(*) as cnt FROM rate_limits WHERE identifier = ? AND endpoint = ? AND request_time >= ?"
        );
        $countStmt->execute([$identifier, $_SERVER['SCRIPT_NAME'] ?? 'unknown', $windowStart]);
        $result = $countStmt->fetch();
        $count = $result['cnt'];

        if ($count >= $maxRequests) {
            return false; // Rate limit exceeded
        }

        // Log this request
        $insertStmt = $this->pdo->prepare(
            "INSERT INTO rate_limits (identifier, endpoint, request_time) VALUES (?, ?, ?)"
        );
        $insertStmt->execute([$identifier, $_SERVER['SCRIPT_NAME'] ?? 'unknown', $now]);

        return true; // Allowed
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
}
