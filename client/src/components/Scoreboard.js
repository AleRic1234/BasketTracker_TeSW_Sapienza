export default {
    props: ['puntiCasa', 'puntiOspiti', 'nomeCasa', 'nomeOspiti'],
    template: `
        <div style="position: absolute; top: -65px; left: 50%; transform: translateX(-50%); width: 100%; max-width: 450px; display: flex; justify-content: center; gap: 80px; background: #2c3e50; color: white; padding: 10px 25px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 50;">
            
            <div style="text-align: center; min-width: 120px;">
                <div style="font-size: 12px; font-weight: bold; letter-spacing: 1px; color: #ecf0f1; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; margin: 0 auto;">
                    {{ nomeCasa || 'CASA' }}
                </div>
                <div style="font-size: 28px; font-weight: bold; color: #3498db; line-height: 1; margin-top: 5px;">
                    {{ puntiCasa }}
                </div>
            </div>

            <div style="text-align: center; min-width: 120px;">
                <div style="font-size: 12px; font-weight: bold; letter-spacing: 1px; color: #ecf0f1; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; margin: 0 auto;">
                    {{ nomeOspiti || 'OSPITI' }}
                </div>
                <div style="font-size: 28px; font-weight: bold; color: #e74c3c; line-height: 1; margin-top: 5px;">
                    {{ puntiOspiti }}
                </div>
            </div>
            
        </div>
    `
};