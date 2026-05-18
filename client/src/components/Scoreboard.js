//Percorso: client/src/components/Scoreboard.js
export default {
    props: ['puntiCasa', 'puntiOspiti', 'nomeCasa', 'nomeOspiti', 'logoCasa', 'logoOspiti'],
    template: `
        <div style="position: absolute; top: -65px; left: 50%; transform: translateX(-50%); width: 100%; max-width: 620px; display: flex; justify-content: center; align-items: center; gap: 50px; background: #2c3e50; color: white; padding: 10px 25px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 50;">
            
            <div style="display: flex; align-items: center; gap: 15px; width: 45%; justify-content: center;">
                <img v-if="logoCasa" :src="logoCasa" style="width: 45px; height: 45px; object-fit: cover; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);">
                <div style="text-align: center;">
                    <div style="font-size: 12px; font-weight: bold; letter-spacing: 1px; color: #ecf0f1; text-transform: uppercase; line-height: 1.2;">
                        {{ nomeCasa || 'CASA' }}
                    </div>
                    <div style="font-size: 32px; font-weight: bold; color: #3498db; line-height: 1; margin-top: 5px;">
                        {{ puntiCasa }}
                    </div>
                </div>
            </div>

            <div style="font-size: 20px; font-weight: bold; color: #7f8c8d;">-</div>

            <div style="display: flex; align-items: center; gap: 15px; flex-direction: row-reverse; width: 45%; justify-content: center;">
                <img v-if="logoOspiti" :src="logoOspiti" style="width: 45px; height: 45px; object-fit: cover; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);">
                <div style="text-align: center;">
                    <div style="font-size: 12px; font-weight: bold; letter-spacing: 1px; color: #ecf0f1; text-transform: uppercase; line-height: 1.2;">
                        {{ nomeOspiti || 'OSPITI' }}
                    </div>
                    <div style="font-size: 32px; font-weight: bold; color: #e74c3c; line-height: 1; margin-top: 5px;">
                        {{ puntiOspiti }}
                    </div>
                </div>
            </div>

        </div>
    `
};