<?php

use CodeIgniter\Router\RouteCollection;

/**
 * TrimPlate Complete Healthy Food E-Commerce & Website CMS
 * CodeIgniter 4 Primary REST API Routes
 *
 * @var RouteCollection $routes
 */

// Dynamic SEO Routes
$routes->get('robots.txt', 'Api\TrimplateApiController::robotsTxt');
$routes->get('sitemap.xml', 'Api\TrimplateApiController::sitemapXml');

$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function ($routes) {
    // Public Site Bootstrap & Catalog
    $routes->get('site/bootstrap', 'TrimplateApiController::siteBootstrap');
    $routes->get('categories', 'TrimplateApiController::categories');
    $routes->get('products', 'TrimplateApiController::products');
    $routes->get('products/(:segment)', 'TrimplateApiController::productDetail/$1');
    $routes->get('offers', 'TrimplateApiController::offers');
    $routes->get('pages', 'TrimplateApiController::pages');
    $routes->get('pages/(:segment)', 'TrimplateApiController::pageBySlug/$1');
    $routes->get('subscription-plans', 'TrimplateApiController::subscriptionPlans');
    $routes->post('coupons/validate', 'TrimplateApiController::validateCoupon');
    $routes->post('newsletter/subscribe', 'TrimplateApiController::subscribeNewsletter');
    $routes->post('contact-inquiry', 'TrimplateApiController::contactInquiry');

    // Authentication
    $routes->post('auth/login', 'TrimplateApiController::login');
    $routes->post('auth/register', 'TrimplateApiController::register');
    $routes->post('auth/forgot-password', 'TrimplateApiController::forgotPassword');

    // Authenticated Customer Endpoints
    $routes->group('', ['filter' => 'jwtAuth'], static function ($routes) {
        $routes->get('auth/me', 'TrimplateApiController::me');
        $routes->put('auth/profile', 'TrimplateApiController::updateProfile');
        $routes->put('auth/password', 'TrimplateApiController::updatePassword');
        $routes->post('addresses', 'TrimplateApiController::createAddress');
        $routes->delete('addresses/(:num)', 'TrimplateApiController::deleteAddress/$1');
        $routes->get('orders', 'TrimplateApiController::orders');
        $routes->post('orders', 'TrimplateApiController::placeOrder');
        $routes->patch('orders/(:num)/status', 'TrimplateApiController::updateOrderStatus/$1');
        $routes->get('subscriptions', 'TrimplateApiController::subscriptions');
        $routes->patch('subscriptions/(:num)/status', 'TrimplateApiController::updateSubscription/$1');
        $routes->post('subscriptions/(:num)/renew', 'TrimplateApiController::renewSubscription/$1');
        $routes->post('reviews', 'TrimplateApiController::createReview');
        $routes->get('payments', 'TrimplateApiController::payments');
        $routes->get('notifications', 'TrimplateApiController::notifications');
    });

    // Protected Admin Website CMS & Operations Endpoints
    $routes->group('', ['filter' => 'jwtAdmin'], static function ($routes) {
        $routes->get('admin/dashboard', 'TrimplateApiController::adminDashboard');
        $routes->post('admin/import-excel', 'TrimplateApiController::importExcel');
        $routes->get('admin/export-excel', 'TrimplateApiController::exportExcel');

        // Catalog & Plans CRUD
        $routes->post('categories', 'TrimplateApiController::saveCategory');
        $routes->put('categories/(:num)', 'TrimplateApiController::saveCategory/$1');
        $routes->delete('categories/(:num)', 'TrimplateApiController::deleteCategory/$1');
        $routes->post('products', 'TrimplateApiController::saveProduct');
        $routes->put('products/(:num)', 'TrimplateApiController::saveProduct/$1');
        $routes->delete('products/(:num)', 'TrimplateApiController::deleteProduct/$1');
        $routes->post('subscription-plans', 'TrimplateApiController::savePlan');
        $routes->put('subscription-plans/(:num)', 'TrimplateApiController::savePlan/$1');
        $routes->delete('subscription-plans/(:num)', 'TrimplateApiController::deletePlan/$1');

        // Complete Website CMS Endpoints
        $routes->get('cms/hero-slides', 'TrimplateApiController::cmsHeroSlides');
        $routes->post('cms/hero-slides', 'TrimplateApiController::saveHeroSlide');
        $routes->put('cms/hero-slides/(:num)', 'TrimplateApiController::saveHeroSlide/$1');
        $routes->put('cms/hero-slides-reorder', 'TrimplateApiController::reorderHeroSlides');
        $routes->delete('cms/hero-slides/(:num)', 'TrimplateApiController::deleteHeroSlide/$1');

        $routes->get('cms/homepage-sections', 'TrimplateApiController::cmsHomepageSections');
        $routes->put('cms/homepage-sections/(:num)', 'TrimplateApiController::saveHomepageSection/$1');
        $routes->put('cms/homepage-sections-reorder', 'TrimplateApiController::reorderHomepageSections');

        $routes->get('cms/banners', 'TrimplateApiController::cmsBanners');
        $routes->post('cms/banners', 'TrimplateApiController::saveBanner');
        $routes->put('cms/banners/(:num)', 'TrimplateApiController::saveBanner/$1');
        $routes->delete('cms/banners/(:num)', 'TrimplateApiController::deleteBanner/$1');

        $routes->post('cms/offers', 'TrimplateApiController::saveOffer');
        $routes->put('cms/offers/(:num)', 'TrimplateApiController::saveOffer/$1');
        $routes->delete('cms/offers/(:num)', 'TrimplateApiController::deleteOffer/$1');

        $routes->post('cms/pages', 'TrimplateApiController::savePage');
        $routes->put('cms/pages/(:num)', 'TrimplateApiController::savePage/$1');
        $routes->delete('cms/pages/(:num)', 'TrimplateApiController::deletePage/$1');

        $routes->get('cms/navigation', 'TrimplateApiController::cmsNavigation');
        $routes->post('cms/navigation', 'TrimplateApiController::saveNavigation');
        $routes->put('cms/navigation/(:num)', 'TrimplateApiController::saveNavigation/$1');
        $routes->delete('cms/navigation/(:num)', 'TrimplateApiController::deleteNavigation/$1');

        $routes->get('cms/media', 'TrimplateApiController::cmsMedia');
        $routes->post('cms/media', 'TrimplateApiController::saveMedia');
        $routes->delete('cms/media/(:num)', 'TrimplateApiController::deleteMedia/$1');

        $routes->get('cms/testimonials', 'TrimplateApiController::cmsTestimonials');
        $routes->post('cms/testimonials', 'TrimplateApiController::saveTestimonial');
        $routes->put('cms/testimonials/(:num)', 'TrimplateApiController::saveTestimonial/$1');
        $routes->delete('cms/testimonials/(:num)', 'TrimplateApiController::deleteTestimonial/$1');

        $routes->get('cms/gallery', 'TrimplateApiController::cmsGallery');
        $routes->post('cms/gallery', 'TrimplateApiController::saveGallery');
        $routes->delete('cms/gallery/(:num)', 'TrimplateApiController::deleteGallery/$1');

        $routes->get('cms/newsletter', 'TrimplateApiController::cmsNewsletter');
        $routes->delete('cms/newsletter/(:num)', 'TrimplateApiController::deleteNewsletter/$1');

        $routes->get('customers', 'TrimplateApiController::customers');
        $routes->get('customers/(:num)/details', 'TrimplateApiController::customerDetails/$1');
        $routes->put('settings', 'TrimplateApiController::updateSettings');
    });
});
