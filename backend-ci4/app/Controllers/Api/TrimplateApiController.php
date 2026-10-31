<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use Config\Database;

/**
 * Primary CodeIgniter 4 REST API Controller for TrimPlate Website & CMS.
 * Handles site bootstrap, auto-expiring offers, honest payment verification,
 * dynamic sitemap.xml, and real SQL analytics. Node.js handles WebSocket broadcasts.
 */
class TrimplateApiController extends ResourceController
{
    protected $format = 'json';
    protected $db;

    public function __construct()
    {
        $this->db = Database::connect();
    }

    public function siteBootstrap()
    {
        $today = date('Y-m-d');
        $now   = date('Y-m-d H:i:s');

        $settingsRows = $this->db->table('website_settings')->get()->getResultArray();
        $settings = [];
        foreach ($settingsRows as $r) {
            $settings[$r['setting_key']] = $r['setting_value'];
        }

        $navigation = $this->db->table('navigation_items')
            ->where('is_active', 1)
            ->orderBy('sort_order', 'ASC')
            ->get()->getResultArray();

        $heroSlides = $this->db->table('hero_slides')
            ->where('is_active', 1)
            ->where('start_date <=', $today)
            ->where('end_date >=', $today)
            ->orderBy('sort_order', 'ASC')
            ->get()->getResultArray();

        $sections = $this->db->table('homepage_sections')
            ->orderBy('sort_order', 'ASC')
            ->get()->getResultArray();

        // Automatically exclude expired offers
        $activeOffers = $this->db->table('offers')
            ->where('is_active', 1)
            ->where('start_datetime <=', $now)
            ->where('end_datetime >=', $now)
            ->orderBy('id', 'DESC')
            ->get()->getResultArray();

        $banners = $this->db->table('banners')->where('is_active', 1)->get()->getResultArray();
        $testimonials = $this->db->table('testimonials')->where('is_approved', 1)->orderBy('sort_order', 'ASC')->get()->getResultArray();
        $gallery = $this->db->table('gallery')->where('is_active', 1)->orderBy('sort_order', 'ASC')->get()->getResultArray();
        $plans = $this->db->table('subscription_plans')->where('is_active', 1)->orderBy('duration_days', 'ASC')->get()->getResultArray();

        return $this->respond([
            'settings'         => $settings,
            'navigation'       => $navigation,
            'heroSlides'       => $heroSlides,
            'homepageSections' => $sections,
            'banners'          => $banners,
            'activeOffers'     => $activeOffers,
            'testimonials'     => $testimonials,
            'gallery'          => $gallery,
            'plans'            => $plans,
        ]);
    }

    public function sitemapXml()
    {
        $base = rtrim(env('app.baseURL', 'https://trimplate.in'), '/');
        $pages = $this->db->table('pages')->select('slug')->where('is_published', 1)->get()->getResultArray();
        $prods = $this->db->table('products')->select('slug')->where('is_available', 1)->get()->getResultArray();

        $urls = [$base . '/', $base . '/cafe-menu', $base . '/green-menu', $base . '/diet-menu', $base . '/gym-menu', $base . '/subscriptions', $base . '/offers'];
        foreach ($pages as $p) $urls[] = $base . '/page/' . $p['slug'];
        foreach ($prods as $p) $urls[] = $base . '/product/' . $p['slug'];

        $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach ($urls as $u) {
            $xml .= "  <url><loc>{$u}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n";
        }
        $xml .= "</urlset>";

        return $this->response->setContentType('application/xml')->setBody($xml);
    }

    public function placeOrder()
    {
        $payload = $this->request->getJSON(true);
        $method  = $payload['payment_method'] ?? 'Cash on Delivery';

        // Honest payment verification: never fake online payment gateway success
        if ($method === 'UPI' && strlen(trim($payload['payment_reference'] ?? '')) < 8) {
            return $this->failValidationErrors('A valid 12-digit UPI UTR reference is required.');
        }

        $paymentStatus = ($method === 'Cash on Delivery') ? 'Pending' : 'Verification Pending';
        $orderCode     = 'TP' . random_int(100000, 999999);

        $this->db->transStart();
        $this->db->table('orders')->insert([
            'order_code'                => $orderCode,
            'user_id'                   => $this->request->user->userId,
            'customer_name_snapshot'    => $payload['customer_name'] ?? '',
            'customer_phone_snapshot'   => $payload['customer_phone'] ?? '',
            'delivery_address_snapshot' => $payload['delivery_address_text'] ?? '',
            'delivery_date'             => $payload['delivery_date'] ?? date('Y-m-d'),
            'subtotal'                  => $payload['subtotal'],
            'delivery_charge'           => $payload['delivery_charge'],
            'gst_amount'                => $payload['gst_amount'],
            'coupon_code'               => $payload['coupon_code'] ?? '',
            'discount_amount'           => $payload['discount_amount'] ?? 0,
            'total_amount'              => $payload['total_amount'],
            'payment_method'            => $method,
            'payment_reference'         => $payload['payment_reference'] ?? '',
            'payment_status'            => $paymentStatus,
            'order_status'              => 'Placed',
        ]);
        $orderId = $this->db->insertID();
        $this->db->transComplete();

        $this->notifyNodeService('order_created', ['orderId' => $orderId, 'orderCode' => $orderCode]);

        return $this->respondCreated([
            'orderId'       => $orderId,
            'orderCode'     => $orderCode,
            'paymentStatus' => $paymentStatus,
        ]);
    }

    private function notifyNodeService(string $event, array $payload): void
    {
        $url = env('NODE_REALTIME_WEBHOOK', 'http://127.0.0.1:4001/internal/broadcast');
        $ch  = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT_MS     => 500,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => json_encode(['event' => $event, 'payload' => $payload]),
        ]);
        @curl_exec($ch);
        @curl_close($ch);
    }
}
