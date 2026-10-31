<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductModel extends Model
{
    protected $table          = 'products';
    protected $primaryKey     = 'id';
    protected $returnType     = 'array';
    protected $allowedFields  = [
        'category_id', 'menu_division', 'name', 'slug', 'description',
        'price', 'is_veg', 'diet_types', 'meal_time', 'is_available', 'image_key'
    ];
}

class OrderModel extends Model
{
    protected $table          = 'orders';
    protected $primaryKey     = 'id';
    protected $returnType     = 'array';
    protected $allowedFields  = [
        'order_code', 'user_id', 'address_id', 'subtotal', 'delivery_charge',
        'gst_amount', 'coupon_code', 'discount_amount', 'total_amount',
        'payment_method', 'payment_status', 'order_status', 'assigned_staff_id',
        'delivery_notes', 'estimated_delivery'
    ];
}

class SubscriptionModel extends Model
{
    protected $table          = 'subscriptions';
    protected $primaryKey     = 'id';
    protected $returnType     = 'array';
    protected $allowedFields  = [
        'subscription_code', 'user_id', 'plan_id', 'menu_preference',
        'is_veg_only', 'start_date', 'end_date', 'delivery_slot',
        'address_id', 'status', 'skipped_dates_json', 'total_paid', 'payment_method'
    ];
}
