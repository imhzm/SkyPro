@echo off
echo ==================================================
echo 🚀 بدء تجهيز المشروع ورفعه على GitHub
echo ==================================================

echo.
echo [1/3] نسخ الصور الجديدة إلى مجلد public...
mkdir "public\images" 2>nul
copy "C:\Users\skywa\.gemini\antigravity\brain\fc90e8b8-6b19-4ceb-aea6-d7c0ca6cd1f1\hero_dashboard_1778268775815.png" "public\images\hero-dashboard.png" 2>nul
copy "C:\Users\skywa\.gemini\antigravity\brain\fc90e8b8-6b19-4ceb-aea6-d7c0ca6cd1f1\platforms_network_1778268789267.png" "public\images\platforms-network.png" 2>nul
copy "C:\Users\skywa\.gemini\antigravity\brain\fc90e8b8-6b19-4ceb-aea6-d7c0ca6cd1f1\data_extraction_1778268804196.png" "public\images\data-extraction.png" 2>nul
copy "C:\Users\skywa\.gemini\antigravity\brain\fc90e8b8-6b19-4ceb-aea6-d7c0ca6cd1f1\bulk_messaging_1778268816889.png" "public\images\bulk-messaging.png" 2>nul
copy "C:\Users\skywa\.gemini\antigravity\brain\fc90e8b8-6b19-4ceb-aea6-d7c0ca6cd1f1\hero_background_1778268831264.png" "public\images\hero-background.png" 2>nul
copy "C:\Users\skywa\.gemini\antigravity\brain\fc90e8b8-6b19-4ceb-aea6-d7c0ca6cd1f1\campaign_analytics_1778268845343.png" "public\images\campaign-analytics.png" 2>nul
echo تمت عملية النسخ بنجاح!

echo.
echo [2/3] إضافة التعديلات إلى Git...
git add .
git commit -m "feat(ui): complete homepage redesign with premium SaaS UI, animations, and AI images"

echo.
echo [3/3] جاري الرفع إلى GitHub...
git push origin main

echo.
echo ==================================================
echo ✅ تم الانتهاء بنجاح! يمكنك الآن تشغيل المشروع
echo ==================================================
pause
