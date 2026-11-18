export function validateThreeLow(c){
 if(!Array.isArray(c?.macro)||c.macro.length!==2||c.macro[0].symbol!=='DX-Y.NYB'||c.macro[1].symbol!=='CL=F'||c.macro.some(r=>r.group!=='시장지표'))throw Error('3저 지표 설정 오류');
 for(const key of ['dollar_change20_max','oil_change20_max','yield_change20_bp_max','vix_max','rsi_min','rsi_max','sma20_gap_max','volume_ratio_min'])if(!Number.isFinite(c[key]))throw Error('3저 기준값 오류');
 if(c.dollar_change20_max>=0||c.oil_change20_max>=0||c.yield_change20_bp_max>=0||c.vix_max<=0||c.rsi_min<0||c.rsi_min>=c.rsi_max||c.rsi_max>100||c.sma20_gap_max<=0||c.volume_ratio_min<=0)throw Error('3저 기준 범위 오류');
 if(!Array.isArray(c.candidates)||!c.candidates.length||c.candidates.length>40||new Set(c.candidates.map(r=>r.symbol)).size!==c.candidates.length||c.candidates.some(r=>!/^[-A-Z.]{1,12}$/.test(r.symbol)||!['정보기술','플랫폼'].includes(r.category)))throw Error('기술주 표본 설정 오류');
 return c;
}
