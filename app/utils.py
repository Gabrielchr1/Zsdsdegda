# app/utils.py

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64
import numpy as np
import numpy_financial as npf


def generate_monthly_production_chart(data):
    """Gera um gráfico de barras da produção mensal e retorna como imagem base64."""
    if not data or len(data) != 12:
        return None # Retorna nada se não houver dados para os 12 meses

    meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    
    plt.style.use('seaborn-v0_8-whitegrid')
    fig, ax = plt.subplots(figsize=(10, 5))

    bars = ax.bar(meses, data, color='#28a745')

    ax.set_title('Produção Mensal Estimada (kWh)', fontsize=16, fontweight='bold', pad=20)
    ax.set_ylabel('Produção (kWh)')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.yaxis.grid(True, linestyle='--', alpha=0.6)
    ax.xaxis.grid(False)
    
    # Adiciona os valores no topo das barras
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 5, f'{int(yval)}', ha='center', va='bottom')

    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode('utf-8')


def generate_payback_chart(investment, annual_savings, years=30):
    """Gera um gráfico de linha do payback e retorna como imagem base64."""
    if not investment or not annual_savings or investment <= 0 or annual_savings <= 0:
        return None

    cumulative_savings = np.cumsum([annual_savings] * years)
    year_axis = np.arange(1, years + 1)
    
    payback_year = investment / annual_savings
    
    plt.style.use('seaborn-v0_8-whitegrid')
    fig, ax = plt.subplots(figsize=(10, 5))

    ax.plot(year_axis, cumulative_savings, color='#28a745', marker='o', linestyle='-', label='Economia Acumulada')
    ax.axhline(y=investment, color='#dc3545', linestyle='--', label='Investimento Inicial')
    
    # Ponto de payback
    ax.axvline(x=payback_year, color='grey', linestyle=':', label=f'Payback em {payback_year:.1f} anos')
    
    ax.set_title('Análise de Retorno do Investimento (Payback)', fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel('Anos')
    ax.set_ylabel('Valor (R$)')
    ax.legend()
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    # Formata o eixo Y para R$
    from matplotlib.ticker import FuncFormatter
    formatter = FuncFormatter(lambda y, _: f'R$ {int(y):,}'.replace(',', '.'))
    ax.yaxis.set_major_formatter(formatter)

    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode('utf-8')




def calculate_advanced_financials(investment, annual_savings, years=25, energy_inflation_rate=0.08, discount_rate=0.06):
    """Calcula VPL, TIR e outras métricas financeiras avançadas."""
    if not investment or not annual_savings or investment <= 0 or annual_savings <= 0:
        return {}

    # Cria o fluxo de caixa anual, considerando a inflação energética
    cash_flows = [-investment] # Ano 0 é o investimento inicial
    for i in range(1, years + 1):
        savings_this_year = annual_savings * ((1 + energy_inflation_rate) ** i)
        cash_flows.append(savings_this_year)

    # Calcula as métricas
    npv = npf.npv(discount_rate, cash_flows)
    irr = npf.irr(cash_flows) * 100 # Em porcentagem
    total_savings = sum(cash_flows[1:])
    profit_in_25_years = total_savings - investment

    return {
        'npv': npv,
        'irr': irr,
        'profit_in_25_years': profit_in_25_years,
        'total_savings_in_25_years': total_savings
    }



# SUBSTITUA a função generate_cost_comparison_chart por esta:
def generate_cumulative_cost_chart(investment, old_annual_bill, new_annual_bill, years=25, energy_inflation_rate=0.08):
    """Gera um gráfico de linhas comparando os custos acumulados com e sem o sistema solar."""
    if not investment or not old_annual_bill:
        return None

    year_axis = np.arange(0, years + 1)
    cost_without_solar = [0] * (years + 1)
    cost_with_solar = [investment] * (years + 1)

    cumulative_cost_without = 0
    cumulative_cost_with = investment
    
    for i in range(1, years + 1):
        # Calcula o custo daquele ano, considerando a inflação
        current_bill_without = old_annual_bill * ((1 + energy_inflation_rate) ** (i - 1))
        current_bill_with = new_annual_bill * ((1 + energy_inflation_rate) ** (i - 1))
        
        cumulative_cost_without += current_bill_without
        cumulative_cost_with += current_bill_with
        
        cost_without_solar[i] = cumulative_cost_without
        cost_with_solar[i] = cumulative_cost_with

    plt.style.use('seaborn-v0_8-whitegrid')
    fig, ax = plt.subplots(figsize=(10, 5))

    # Plota as linhas
    ax.plot(year_axis, cost_without_solar, color='#dc3545', marker='', linestyle='--', label='Custo Sem Energia Solar')
    ax.plot(year_axis, cost_with_solar, color='#28a745', marker='', linestyle='-', label='Custo Com Energia Solar (Incluso Investimento)')

    # Preenche a área de economia
    ax.fill_between(year_axis, cost_with_solar, cost_without_solar, where=(year_axis > 0), color='green', alpha=0.1, interpolate=True, label='Economia Gerada')
    
    ax.set_title('Projeção de Custo Acumulado em 25 Anos', fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel('Anos')
    ax.set_ylabel('Custo Total (R$)')
    ax.legend()
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    # Formata o eixo Y para R$
    from matplotlib.ticker import FuncFormatter
    formatter = FuncFormatter(lambda y, _: f'R$ {int(y/1000)}k' if y > 0 else 'R$ 0')
    ax.yaxis.set_major_formatter(formatter)
    
    ax.set_xlim(0, years)

    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode('utf-8')