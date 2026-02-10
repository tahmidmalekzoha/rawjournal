-- RawJournal Database Schema
-- Run in Supabase SQL Editor after deploying Supabase via Coolify

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'elite')),
    subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    trade_count_this_month INTEGER NOT NULL DEFAULT 0,
    month_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. ACCOUNTS
-- ============================================================
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'My Account',
    broker TEXT NOT NULL,
    mt5_server TEXT NOT NULL,
    mt5_login TEXT NOT NULL,
    mt5_investor_password_encrypted TEXT NOT NULL,
    account_currency TEXT NOT NULL DEFAULT 'USD',
    initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(15,2),
    current_equity DECIMAL(15,2),
    sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT DEFAULT 'pending' CHECK (last_sync_status IN ('pending', 'syncing', 'success', 'error')),
    last_sync_error TEXT,
    sync_fail_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, mt5_login, mt5_server)
);

CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_accounts_sync ON public.accounts(sync_enabled, last_sync_at);
CREATE INDEX idx_accounts_broker ON public.accounts(mt5_server);

-- ============================================================
-- 3. TRADES
-- ============================================================
CREATE TABLE public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
    entry_timestamp TIMESTAMPTZ NOT NULL,
    exit_timestamp TIMESTAMPTZ,
    entry_price DECIMAL(15,6) NOT NULL,
    exit_price DECIMAL(15,6),
    position_size DECIMAL(15,4) NOT NULL,
    pnl DECIMAL(15,2),
    pnl_pips DECIMAL(15,2),
    commission DECIMAL(15,4) DEFAULT 0,
    swap DECIMAL(15,4) DEFAULT 0,
    stop_loss DECIMAL(15,6),
    take_profit DECIMAL(15,6),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    import_source TEXT NOT NULL DEFAULT 'manual' CHECK (import_source IN ('manual', 'csv', 'mt5')),
    session_tag TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(account_id, ticket_number)
);

CREATE INDEX idx_trades_user_date ON public.trades(user_id, exit_timestamp DESC);
CREATE INDEX idx_trades_account ON public.trades(account_id, entry_timestamp DESC);
CREATE INDEX idx_trades_symbol ON public.trades(user_id, symbol);
CREATE INDEX idx_trades_status ON public.trades(user_id, status);
CREATE INDEX idx_trades_session ON public.trades(user_id, session_tag);
CREATE INDEX idx_trades_pnl ON public.trades(user_id, pnl);

-- ============================================================
-- 4. OPEN POSITIONS (live, replaced each sync)
-- ============================================================
CREATE TABLE public.open_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
    entry_timestamp TIMESTAMPTZ NOT NULL,
    entry_price DECIMAL(15,6) NOT NULL,
    current_price DECIMAL(15,6),
    position_size DECIMAL(15,4) NOT NULL,
    floating_pnl DECIMAL(15,2),
    stop_loss DECIMAL(15,6),
    take_profit DECIMAL(15,6),
    swap DECIMAL(15,4) DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(account_id, ticket_number)
);

CREATE INDEX idx_open_positions_user ON public.open_positions(user_id);
CREATE INDEX idx_open_positions_symbol ON public.open_positions(symbol);

-- ============================================================
-- 5. JOURNALS
-- ============================================================
CREATE TABLE public.journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    mood TEXT CHECK (mood IN ('confident', 'uncertain', 'fearful', 'neutral', 'greedy', 'disciplined')),
    setup_quality INTEGER CHECK (setup_quality BETWEEN 1 AND 5),
    followed_plan BOOLEAN,
    screenshot_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(trade_id)
);

CREATE INDEX idx_journals_user ON public.journals(user_id);
CREATE INDEX idx_journals_tags ON public.journals USING GIN(tags);

-- ============================================================
-- 6. TAGS
-- ============================================================
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_tags_user ON public.tags(user_id);

-- ============================================================
-- 7. CANDLE CACHE (global, shared)
-- ============================================================
CREATE TABLE public.candle_cache (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL CHECK (timeframe IN ('M30', 'H1', 'H4', 'D1', 'W1')),
    timestamp TIMESTAMPTZ NOT NULL,
    open DECIMAL(15,6) NOT NULL,
    high DECIMAL(15,6) NOT NULL,
    low DECIMAL(15,6) NOT NULL,
    close DECIMAL(15,6) NOT NULL,
    volume DECIMAL(15,2) DEFAULT 0,
    UNIQUE(symbol, timeframe, timestamp)
);

CREATE INDEX idx_candles_lookup ON public.candle_cache(symbol, timeframe, timestamp DESC);

-- ============================================================
-- 8. HOT SYMBOLS
-- ============================================================
CREATE TABLE public.hot_symbols (
    symbol TEXT PRIMARY KEY,
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    candle_data_since TIMESTAMPTZ
);

-- ============================================================
-- 9. ANALYTICS CACHE
-- ============================================================
CREATE TABLE public.analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    period TEXT NOT NULL DEFAULT 'all' CHECK (period IN ('today', 'week', 'month', 'year', 'all')),
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    breakeven_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    profit_factor DECIMAL(10,2) DEFAULT 0,
    avg_win DECIMAL(15,2) DEFAULT 0,
    avg_loss DECIMAL(15,2) DEFAULT 0,
    largest_win DECIMAL(15,2) DEFAULT 0,
    largest_loss DECIMAL(15,2) DEFAULT 0,
    total_pnl DECIMAL(15,2) DEFAULT 0,
    max_drawdown DECIMAL(15,2) DEFAULT 0,
    max_drawdown_pct DECIMAL(5,2) DEFAULT 0,
    avg_trade_duration INTERVAL,
    best_symbol TEXT,
    worst_symbol TEXT,
    best_session TEXT,
    worst_session TEXT,
    consecutive_wins INTEGER DEFAULT 0,
    consecutive_losses INTEGER DEFAULT 0,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, account_id, period)
);

-- ============================================================
-- 10. FUNCTIONS & TRIGGERS
-- ============================================================

-- Session tagging
CREATE OR REPLACE FUNCTION public.get_session_tag(entry_time TIMESTAMPTZ)
RETURNS TEXT AS $$
DECLARE
    hour INTEGER;
BEGIN
    hour := EXTRACT(HOUR FROM entry_time AT TIME ZONE 'UTC');
    IF hour >= 0 AND hour < 8 THEN RETURN 'asian';
    ELSIF hour >= 8 AND hour < 13 THEN RETURN 'london';
    ELSIF hour >= 13 AND hour < 16 THEN RETURN 'overlap';
    ELSIF hour >= 16 AND hour < 22 THEN RETURN 'newyork';
    ELSE RETURN 'late-ny';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.auto_tag_session()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.session_tag IS NULL THEN
        NEW.session_tag := public.get_session_tag(NEW.entry_timestamp);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_session_tag
    BEFORE INSERT OR UPDATE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION public.auto_tag_session();

-- Analytics cache invalidation
CREATE OR REPLACE FUNCTION public.invalidate_analytics_cache()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.analytics_cache WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_change
    AFTER INSERT OR UPDATE OR DELETE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION public.invalidate_analytics_cache();

-- Updated_at auto-update
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_accounts_timestamp BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_trades_timestamp BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_journals_timestamp BEFORE UPDATE ON public.journals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Monthly trade count reset
CREATE OR REPLACE FUNCTION public.reset_monthly_trade_count()
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET trade_count_this_month = 0, month_reset_date = CURRENT_DATE
    WHERE month_reset_date < date_trunc('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candle_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_symbols ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY accounts_all ON public.accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY trades_all ON public.trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY positions_all ON public.open_positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY journals_all ON public.journals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY tags_all ON public.tags FOR ALL USING (auth.uid() = user_id);
CREATE POLICY analytics_select ON public.analytics_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY candles_select ON public.candle_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY hot_symbols_select ON public.hot_symbols FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 12. STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('trade-screenshots', 'trade-screenshots', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']);

CREATE POLICY ss_upload ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY ss_read ON storage.objects FOR SELECT
    USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY ss_delete ON storage.objects FOR DELETE
    USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
