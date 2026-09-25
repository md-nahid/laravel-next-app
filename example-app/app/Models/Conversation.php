<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['sender_id', 'receiver_id', 'message'])]
class Conversation extends Model
{
}
