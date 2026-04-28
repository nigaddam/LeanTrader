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
    User,
    Conversation,
    Strategy,
    Backtest,
    Order,
    LiveStrategy,
    LiveOrder,
    LightningPayment,
)

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
    column_list = [Conversation.id, Conversation.session_id, Conversation.created_at, Conversation.updated_at]
    column_searchable_list = [Conversation.session_id]
    column_sortable_list = [Conversation.id, Conversation.created_at]
    can_delete = False


class StrategyAdmin(ModelView, model=Strategy):
    name = "Strategy"
    name_plural = "Strategies"
    icon = "fa-solid fa-code"
    column_list = [Strategy.id, Strategy.name, Strategy.type, Strategy.session_id, Strategy.created_at]
    column_searchable_list = [Strategy.name, Strategy.session_id]
    column_sortable_list = [Strategy.id, Strategy.created_at]


class BacktestAdmin(ModelView, model=Backtest):
    name = "Backtest"
    name_plural = "Backtests"
    icon = "fa-solid fa-chart-line"
    column_list = [Backtest.id, Backtest.strategy_id, Backtest.ticker, Backtest.initial_capital, Backtest.final_value, Backtest.created_at]
    column_sortable_list = [Backtest.id, Backtest.created_at]


class OrderAdmin(ModelView, model=Order):
    name = "Order"
    name_plural = "Orders"
    icon = "fa-solid fa-receipt"
    column_list = [Order.id, Order.strategy_id, Order.ticker, Order.side, Order.amount, Order.status, Order.timestamp]
    column_sortable_list = [Order.id, Order.timestamp]


class LiveStrategyAdmin(ModelView, model=LiveStrategy):
    name = "Live Strategy"
    name_plural = "Live Strategies"
    icon = "fa-solid fa-bolt"
    column_list = [LiveStrategy.id, LiveStrategy.strategy_id, LiveStrategy.ticker, LiveStrategy.amount_usd, LiveStrategy.is_active, LiveStrategy.last_signal, LiveStrategy.total_pnl, LiveStrategy.started_at]
    column_sortable_list = [LiveStrategy.id, LiveStrategy.started_at]


class LiveOrderAdmin(ModelView, model=LiveOrder):
    name = "Live Order"
    name_plural = "Live Orders"
    icon = "fa-solid fa-circle-dot"
    column_list = [LiveOrder.id, LiveOrder.live_strategy_id, LiveOrder.ticker, LiveOrder.side, LiveOrder.amount_usd, LiveOrder.status, LiveOrder.sandbox, LiveOrder.timestamp]
    column_sortable_list = [LiveOrder.id, LiveOrder.timestamp]


class LightningPaymentAdmin(ModelView, model=LightningPayment):
    name = "Lightning Payment"
    name_plural = "Lightning Payments"
    icon = "fa-solid fa-bolt-lightning"
    column_list = [LightningPayment.id, LightningPayment.session_id, LightningPayment.amount_sats, LightningPayment.type, LightningPayment.timestamp]
    column_sortable_list = [LightningPayment.id, LightningPayment.timestamp]


# ── Factory ───────────────────────────────────────────────────────────────────

def create_admin(app) -> Admin:
    auth = _AdminAuth(secret_key=os.getenv("ADMIN_SECRET", "changeme"))
    admin = Admin(app, engine, authentication_backend=auth, title="LangStock Admin")
    admin.add_view(UserAdmin)
    admin.add_view(ConversationAdmin)
    admin.add_view(StrategyAdmin)
    admin.add_view(BacktestAdmin)
    admin.add_view(OrderAdmin)
    admin.add_view(LiveStrategyAdmin)
    admin.add_view(LiveOrderAdmin)
    admin.add_view(LightningPaymentAdmin)
    return admin
