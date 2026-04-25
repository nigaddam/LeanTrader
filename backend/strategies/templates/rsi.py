"""
RSI (Relative Strength Index) Strategy Template.
Buys when RSI crosses below oversold threshold (default 30).
Sells when RSI crosses above overbought threshold (default 70).
"""
import pandas as pd
import pandas_ta as ta


class RSIStrategy:
    """
    RSI Mean-Reversion Strategy.
    
    Generates buy signals when RSI drops below oversold level (asset is cheap/oversold).
    Generates sell signals when RSI rises above overbought level (asset is expensive/overbought).
    
    Parameters:
        rsi_period (int): Lookback period for RSI calculation. Default: 14
        overbought (float): RSI level above which to sell. Default: 70
        oversold (float): RSI level below which to buy. Default: 30
    """

    def __init__(self, rsi_period: int = 14, overbought: float = 70, oversold: float = 30):
        self.rsi_period = rsi_period
        self.overbought = overbought
        self.oversold = oversold

    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate buy/sell signals based on RSI.
        
        Args:
            df: DataFrame with columns open, high, low, close, volume
        
        Returns:
            df with added 'signal' column: 1=buy, -1=sell, 0=hold
        """
        df = df.copy()

        # Calculate RSI
        df["rsi"] = ta.rsi(df["close"], length=self.rsi_period)

        df["signal"] = 0

        # Buy when RSI crosses below oversold
        df.loc[df["rsi"] < self.oversold, "signal"] = 1

        # Sell when RSI crosses above overbought
        df.loc[df["rsi"] > self.overbought, "signal"] = -1

        # Avoid re-entering position: only buy when not already in position
        in_position = False
        for i in range(len(df)):
            if df.iloc[i]["signal"] == 1 and not in_position:
                in_position = True
            elif df.iloc[i]["signal"] == -1 and in_position:
                in_position = False
            elif df.iloc[i]["signal"] == 1 and in_position:
                df.iloc[i, df.columns.get_loc("signal")] = 0  # Already in position
            elif df.iloc[i]["signal"] == -1 and not in_position:
                df.iloc[i, df.columns.get_loc("signal")] = 0  # Not in position to sell

        return df

    def get_description(self) -> str:
        return (
            f"RSI Strategy: Buy when RSI({self.rsi_period}) drops below {self.oversold} (oversold), "
            f"sell when RSI rises above {self.overbought} (overbought)."
        )
