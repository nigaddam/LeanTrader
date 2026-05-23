"""
sqladmin panel — mounted at /admin by main.py.

Access: set ADMIN_SECRET in .env (default: changeme — override before going live).
URL:    http://localhost:8000/admin
"""
import os
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request

from models.db import (
    engine,
    Session,
    User,
    Conversation,
    Strategy,
    Backtest,
    Order,
    LiveStrategy,
    LiveOrder,
    LightningPayment,
)
from data_assets.models.asset import Asset, AssetSource, AssetPrice, AssetOHLCV

class _AdminAuth(AuthenticationBackend):
    async def authenticate(self, request: Request) -> bool:
        return request.session.get("admin_ok") is True

    async def login(self, request: Request) -> bool:
        secret = os.getenv("ADMIN_SECRET", "changeme")
        form = await request.form()
        username = form.get("username", "")
        password = form.get("password", "")
        if username == "admin" and password == secret:
            request.session["admin_ok"] = True
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True


# ── Model views ───────────────────────────────────────────────────────────────

class SessionAdmin(ModelView, model=Session):
    name = "Session"
    name_plural = "Sessions"
    icon = "fa-solid fa-clock-rotate-left"
    column_list = [Session.id, Session.session_id, Session.user_id, Session.parent_session_id, Session.started_at, Session.last_active_at]
    column_searchable_list = [Session.session_id, Session.user_id]
    column_sortable_list = [Session.id, Session.started_at, Session.last_active_at]
    can_delete = False


class UserAdmin(ModelView, model=User):
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-users"
    column_list = [User.id, User.email, User.name, User.created_at, User.last_login]
    column_searchable_list = [User.email, User.name]
    column_sortable_list = [User.id, User.created_at, User.last_login]
    can_delete = False


class ConversationAdmin(ModelView, model=Conversation):
    name = "Conversation"
    name_plural = "Conversations"
    icon = "fa-solid fa-comments"
    column_list = [Conversation.id, Conversation.session_id, Conversation.user_id, Conversation.created_at, Conversation.updated_at]
    column_searchable_list = [Conversation.session_id, Conversation.user_id]
    column_sortable_list = [Conversation.id, Conversation.created_at]
    can_delete = False


class StrategyAdmin(ModelView, model=Strategy):
    name = "Strategy"
    name_plural = "Strategies"
    icon = "fa-solid fa-code"
    column_list = [Strategy.id, Strategy.name, Strategy.type, Strategy.user_id, Strategy.session_id, Strategy.created_at]
    column_searchable_list = [Strategy.name, Strategy.session_id, Strategy.user_id]
    column_sortable_list = [Strategy.id, Strategy.created_at]


class BacktestAdmin(ModelView, model=Backtest):
    name = "Backtest"
    name_plural = "Backtests"
    icon = "fa-solid fa-chart-line"
    column_list = [Backtest.id, Backtest.strategy_id, Backtest.user_id, Backtest.ticker, Backtest.initial_capital, Backtest.final_value, Backtest.created_at]
    column_searchable_list = [Backtest.user_id]
    column_sortable_list = [Backtest.id, Backtest.created_at]


class OrderAdmin(ModelView, model=Order):
    name = "Order"
    name_plural = "Orders"
    icon = "fa-solid fa-receipt"
    column_list = [
        Order.id, Order.created_at, Order.user_id, Order.session_id,
        Order.asset_name, Order.ticker, Order.side, Order.quantity,
        Order.order_type, Order.estimated_value, Order.mode,
        Order.status, Order.external_order_id, Order.strategy_name, Order.notes,
    ]
    column_searchable_list = [Order.session_id, Order.user_id, Order.ticker, Order.external_order_id]
    column_sortable_list = [Order.id, Order.created_at, Order.status, Order.mode]


class LiveStrategyAdmin(ModelView, model=LiveStrategy):
    name = "Live Strategy"
    name_plural = "Live Strategies"
    icon = "fa-solid fa-bolt"
    column_list = [LiveStrategy.id, LiveStrategy.strategy_id, LiveStrategy.user_id, LiveStrategy.ticker, LiveStrategy.amount_usd, LiveStrategy.is_active, LiveStrategy.last_signal, LiveStrategy.total_pnl, LiveStrategy.started_at]
    column_searchable_list = [LiveStrategy.user_id]
    column_sortable_list = [LiveStrategy.id, LiveStrategy.started_at]


class LiveOrderAdmin(ModelView, model=LiveOrder):
    name = "Live Order"
    name_plural = "Live Orders"
    icon = "fa-solid fa-circle-dot"
    column_list = [LiveOrder.id, LiveOrder.live_strategy_id, LiveOrder.session_id, LiveOrder.user_id, LiveOrder.ticker, LiveOrder.side, LiveOrder.amount_usd, LiveOrder.status, LiveOrder.sandbox, LiveOrder.timestamp]
    column_searchable_list = [LiveOrder.session_id, LiveOrder.user_id]
    column_sortable_list = [LiveOrder.id, LiveOrder.timestamp]


class LightningPaymentAdmin(ModelView, model=LightningPayment):
    name = "Lightning Payment"
    name_plural = "Lightning Payments"
    icon = "fa-solid fa-bolt-lightning"
    column_list = [LightningPayment.id, LightningPayment.session_id, LightningPayment.user_id, LightningPayment.amount_sats, LightningPayment.type, LightningPayment.timestamp]
    column_searchable_list = [LightningPayment.session_id, LightningPayment.user_id]
    column_sortable_list = [LightningPayment.id, LightningPayment.timestamp]


# ── Asset platform views ──────────────────────────────────────────────────────

class AssetAdmin(ModelView, model=Asset):
    name = "Asset"
    name_plural = "Assets"
    icon = "fa-solid fa-coins"
    column_list = [Asset.id, Asset.symbol, Asset.display_name, Asset.asset_type, Asset.default_source, Asset.is_active, Asset.updated_at]
    column_searchable_list = [Asset.symbol, Asset.display_name, Asset.asset_type]
    column_sortable_list = [Asset.id, Asset.symbol, Asset.asset_type, Asset.updated_at]


class AssetSourceAdmin(ModelView, model=AssetSource):
    name = "Asset Source"
    name_plural = "Asset Sources"
    icon = "fa-solid fa-link"
    column_list = [AssetSource.id, AssetSource.asset_id, AssetSource.source_name, AssetSource.source_symbol, AssetSource.tradable, AssetSource.min_order_size]
    column_searchable_list = [AssetSource.source_name, AssetSource.source_symbol]
    column_sortable_list = [AssetSource.asset_id, AssetSource.source_name]


class AssetPriceAdmin(ModelView, model=AssetPrice):
    name = "Asset Price"
    name_plural = "Asset Prices"
    icon = "fa-solid fa-chart-line"
    column_list = [AssetPrice.id, AssetPrice.asset_id, AssetPrice.source, AssetPrice.price, AssetPrice.change_24h_pct, AssetPrice.volume_24h, AssetPrice.market_cap, AssetPrice.timestamp]
    column_searchable_list = [AssetPrice.source]
    column_sortable_list = [AssetPrice.asset_id, AssetPrice.timestamp, AssetPrice.price]
    can_delete = False


class AssetOHLCVAdmin(ModelView, model=AssetOHLCV):
    name = "OHLCV Candle"
    name_plural = "OHLCV Candles"
    icon = "fa-solid fa-chart-bar"
    column_list = [AssetOHLCV.id, AssetOHLCV.asset_id, AssetOHLCV.interval, AssetOHLCV.timestamp, AssetOHLCV.open, AssetOHLCV.high, AssetOHLCV.low, AssetOHLCV.close, AssetOHLCV.volume, AssetOHLCV.source]
    column_sortable_list = [AssetOHLCV.asset_id, AssetOHLCV.timestamp]
    can_delete = False


# ── Factory ───────────────────────────────────────────────────────────────────

def create_admin(app) -> Admin:
    auth = _AdminAuth(secret_key=os.getenv("ADMIN_SECRET", "changeme"))
    admin = Admin(app, engine, authentication_backend=auth, title="LangStock Admin")
    admin.add_view(SessionAdmin)
    admin.add_view(UserAdmin)
    admin.add_view(ConversationAdmin)
    admin.add_view(StrategyAdmin)
    admin.add_view(BacktestAdmin)
    admin.add_view(OrderAdmin)
    admin.add_view(LiveStrategyAdmin)
    admin.add_view(LiveOrderAdmin)
    admin.add_view(LightningPaymentAdmin)
    # Asset platform
    admin.add_view(AssetAdmin)
    admin.add_view(AssetSourceAdmin)
    admin.add_view(AssetPriceAdmin)
    admin.add_view(AssetOHLCVAdmin)
    return admin
