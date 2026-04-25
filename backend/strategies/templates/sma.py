"""
SMA (Simple Moving Average) Crossover Strategy Template.
Buys when short MA crosses above long MA (golden cross).
Sells when short MA crosses below long MA (death cross).
"""
import pandas as pd
import pandas_ta as ta


class SMAStrategy:
    """
    SMA Crossover Strategy.
    
    Classic trend-following strategy using two moving averages.
    A golden cross (short crosses above long) signals uptrend → buy.
    A death cross (short crosses below long) signals downtrend → sell.
    
    Parameters:
        short_period (int): Fast moving average period. Default: 20
        long_period (int): Slow moving average period. Default: 50
    """

    def __init__(self, short_period: int = 20, long_period: int = 50):
        self.short_period = short_period
        self.long_period = long_period

    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        df["sma_short"] = ta.sma(df["close"], length=self.short_period)
        df["sma_long"] = ta.sma(df["close"], length=self.long_period)

        df["signal"] = 0

        # Golden cross: short crosses above long → BUY
        df.loc[
            (df["sma_short"] > df["sma_long"]) &
            (df["sma_short"].shift(1) <= df["sma_long"].shift(1)),
            "signal"
        ] = 1

        # Death cross: short crosses below long → SELL
        df.loc[
            (df["sma_short"] < df["sma_long"]) &
            (df["sma_short"].shift(1) >= df["sma_long"].shift(1)),
            "signal"
        ] = -1

        return df.dropna()

    def get_description(self) -> str:
        return (
            f"SMA Crossover: Buy on golden cross (SMA{self.short_period} > SMA{self.long_period}), "
            f"sell on death cross."
        )
