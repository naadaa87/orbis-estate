/* 오르비스중개법인 — 맞춤 매물 의뢰서. 서울 구 경계: 통계청 센서스용 행정구역경계(2013)를 단순화(southkorea/seoul-maps) */
const SEOUL_GU_MAP={w:612.0,h:505.5,gu:[["강동구","M505.3,261.2 L510.4,261.7 L514.3,256.9 L518.4,254.1 L535.0,246.5 L554.2,240.6 L562.5,236.9 L579.3,226.4 L584.4,226.9 L592.6,226.3 L596.9,224.3 L594.6,230.5 L595.6,235.9 L598.1,239.9 L600.0,245.2 L600.6,251.5 L604.1,260.1 L603.2,274.7 L605.8,276.8 L605.1,283.3 L606.0,288.2 L603.4,288.5 L599.9,285.9 L594.9,288.5 L590.2,287.8 L581.4,290.2 L577.1,288.9 L563.3,308.8 L562.9,317.2 L557.4,323.9 L554.9,330.4 L552.2,330.5 L550.7,335.2 L550.5,339.6 L548.5,338.7 L513.9,319.5 L515.8,315.4 L519.8,300.6 L513.1,296.3 L500.2,291.7 L503.8,284.3 L506.4,273.8 L506.5,264.3 L505.3,261.2Z",545.1,277.1],["송파구","M439.1,324.9 L447.6,327.4 L454.4,327.7 L464.0,326.1 L475.4,321.8 L484.7,320.3 L490.4,308.8 L500.2,291.7 L513.1,296.3 L519.8,300.6 L515.8,315.4 L513.9,319.5 L548.5,338.7 L550.5,339.6 L550.5,342.1 L547.5,344.4 L545.5,348.0 L543.8,354.8 L545.5,360.4 L551.4,364.0 L554.9,364.4 L558.4,362.1 L560.9,364.6 L570.8,367.3 L574.5,369.8 L572.4,376.0 L572.6,380.3 L570.1,387.3 L568.0,390.3 L560.8,392.7 L557.3,406.0 L557.3,409.3 L553.1,412.6 L546.8,412.8 L542.5,418.4 L535.6,415.6 L530.5,414.8 L530.9,421.5 L537.3,425.9 L533.4,428.4 L527.7,428.4 L522.6,425.4 L522.6,430.0 L518.5,433.2 L518.5,429.6 L516.0,423.9 L503.3,402.1 L504.1,400.1 L499.5,391.1 L494.7,385.8 L489.7,382.0 L481.8,377.8 L455.5,369.1 L449.8,367.7 L443.2,361.2 L439.4,334.2 L438.5,332.4 L439.1,324.9Z",507.7,354.0],["강남구","M424.2,317.7 L439.1,324.9 L438.5,332.4 L439.4,334.2 L443.2,361.2 L449.8,367.7 L455.5,369.1 L481.8,377.8 L489.7,382.0 L494.7,385.8 L499.5,391.1 L504.1,400.1 L503.3,402.1 L516.0,423.9 L518.5,429.6 L518.5,433.2 L511.6,438.7 L510.5,445.2 L505.5,442.6 L503.8,439.8 L495.6,438.1 L491.5,443.3 L484.0,444.8 L481.2,440.1 L479.4,436.0 L469.7,427.6 L464.3,419.4 L464.0,414.6 L455.2,415.9 L449.1,419.4 L447.3,415.9 L443.8,415.2 L442.4,417.5 L432.8,419.4 L431.5,426.5 L424.5,427.4 L420.3,426.9 L407.7,411.4 L402.4,396.4 L392.0,398.2 L388.5,389.2 L372.6,347.2 L369.3,333.2 L367.6,328.9 L360.1,319.9 L373.1,306.8 L378.8,302.2 L385.9,300.0 L409.0,311.5 L410.4,308.4 L413.5,311.4 L424.2,317.7Z",408.4,349.2],["서초구","M360.1,319.9 L367.6,328.9 L369.3,333.2 L372.6,347.2 L388.5,389.2 L392.0,398.2 L402.4,396.4 L407.7,411.4 L420.3,426.9 L424.5,427.4 L431.5,426.5 L432.8,419.4 L442.4,417.5 L443.8,415.2 L447.3,415.9 L449.1,419.4 L455.2,415.9 L464.0,414.6 L464.3,419.4 L469.7,427.6 L479.4,436.0 L481.2,440.1 L478.8,444.9 L479.5,448.9 L477.4,449.6 L475.9,454.0 L473.4,455.6 L469.8,462.2 L469.8,468.4 L463.8,471.6 L461.2,476.7 L450.3,474.5 L445.9,475.6 L446.3,478.8 L450.0,481.0 L449.1,484.1 L445.7,486.1 L444.4,492.9 L445.3,495.2 L438.8,496.7 L437.3,498.7 L430.7,496.7 L426.1,496.7 L417.9,499.5 L414.6,496.4 L411.2,495.4 L409.6,490.6 L400.2,481.6 L394.5,480.4 L393.9,476.7 L397.9,470.3 L396.9,467.3 L397.3,461.9 L395.0,457.9 L396.3,452.4 L395.8,448.8 L393.1,445.9 L391.3,440.0 L392.9,435.7 L388.0,432.2 L380.5,445.4 L372.6,449.6 L366.3,451.0 L359.0,451.0 L356.0,447.4 L352.1,438.7 L350.7,437.9 L348.0,429.5 L340.2,429.3 L337.8,430.5 L339.1,435.5 L338.6,438.7 L333.4,440.1 L326.8,446.0 L325.1,441.9 L326.1,432.7 L324.3,428.5 L320.9,425.0 L318.1,419.6 L316.7,412.5 L318.6,376.9 L321.7,370.3 L316.1,366.2 L314.9,363.1 L314.6,348.4 L318.0,345.9 L325.0,345.5 L327.9,347.3 L340.3,340.1 L348.5,334.6 L351.8,331.3 L354.8,325.4 L360.1,319.9Z",344.2,382.0],["관악구","M316.7,412.5 L318.1,419.6 L320.9,425.0 L324.3,428.5 L326.1,432.7 L325.1,441.9 L326.8,446.0 L318.4,448.6 L315.6,455.3 L309.1,459.9 L305.8,465.1 L301.6,465.2 L292.1,468.7 L291.6,474.9 L290.2,476.9 L284.9,477.5 L283.5,479.7 L276.0,479.7 L264.6,483.2 L260.4,483.2 L256.3,486.1 L254.6,483.5 L254.9,478.3 L250.8,473.0 L244.2,468.5 L244.2,464.1 L240.9,460.4 L233.0,452.7 L231.9,448.6 L223.8,446.7 L220.8,446.8 L220.2,439.9 L218.1,435.5 L219.4,433.1 L216.4,430.8 L211.5,419.8 L215.1,418.0 L216.9,412.0 L213.3,409.7 L213.7,404.8 L200.7,407.7 L198.9,405.9 L204.3,397.5 L208.3,397.5 L218.7,393.5 L224.2,389.5 L234.6,388.5 L237.9,380.9 L239.5,379.4 L244.7,382.5 L249.3,382.8 L251.8,384.5 L259.4,384.4 L267.3,381.0 L274.1,384.1 L277.0,386.6 L281.0,385.6 L287.5,382.3 L286.9,386.9 L289.1,393.4 L287.7,400.2 L300.8,414.9 L310.0,412.7 L316.7,412.5Z",270.5,429.3],["동작구","M314.6,348.4 L314.9,363.1 L316.1,366.2 L321.7,370.3 L318.6,376.9 L316.7,412.5 L310.0,412.7 L300.8,414.9 L287.7,400.2 L289.1,393.4 L286.9,386.9 L287.5,382.3 L281.0,385.6 L277.0,386.6 L274.1,384.1 L267.3,381.0 L259.4,384.4 L251.8,384.5 L249.3,382.8 L244.7,382.5 L239.5,379.4 L237.9,380.9 L234.6,388.5 L224.2,389.5 L218.7,393.5 L208.3,397.5 L204.3,397.5 L217.7,376.8 L227.9,374.5 L230.0,366.5 L236.1,347.4 L238.6,346.8 L237.0,341.2 L246.2,342.0 L259.9,338.8 L272.0,334.1 L276.3,338.6 L282.0,342.6 L292.4,347.2 L314.6,348.4Z",258.1,361.5],["영등포구","M185.0,279.5 L200.7,290.5 L208.6,294.3 L241.6,303.4 L249.5,304.7 L262.2,317.1 L266.7,321.4 L268.5,327.6 L272.0,334.1 L259.9,338.8 L246.2,342.0 L237.0,341.2 L238.6,346.8 L236.1,347.4 L230.0,366.5 L227.9,374.5 L217.7,376.8 L204.3,397.5 L200.4,396.3 L194.7,390.1 L190.7,376.2 L190.2,364.6 L190.9,356.8 L186.0,349.4 L170.3,340.0 L170.8,330.1 L171.8,324.7 L173.5,322.7 L181.0,318.5 L183.2,314.7 L185.4,315.3 L187.6,310.3 L187.2,305.5 L181.5,291.8 L179.9,291.4 L178.6,286.5 L185.0,279.5Z",211.6,327.5],["금천구","M198.9,405.9 L200.7,407.7 L213.7,404.8 L213.3,409.7 L216.9,412.0 L215.1,418.0 L211.5,419.8 L216.4,430.8 L219.4,433.1 L218.1,435.5 L220.2,439.9 L220.8,446.8 L223.8,446.7 L231.9,448.6 L233.0,452.7 L240.9,460.4 L233.4,466.9 L230.0,471.4 L228.2,476.5 L225.5,479.0 L220.2,478.8 L216.0,483.3 L212.2,490.0 L203.7,489.5 L203.6,486.2 L198.8,482.2 L197.9,480.1 L198.2,473.2 L197.2,470.4 L193.4,468.5 L194.0,463.8 L191.2,456.0 L189.1,457.3 L184.6,455.8 L184.0,451.4 L179.9,449.2 L179.9,443.7 L183.4,438.2 L170.9,419.5 L166.2,410.9 L161.6,398.0 L163.5,396.7 L169.2,394.6 L172.0,395.7 L179.5,401.9 L184.0,407.2 L192.3,409.2 L198.2,408.4 L198.9,405.9Z",212.7,462.5],["구로구","M91.9,355.3 L98.1,355.4 L102.3,360.9 L108.5,365.9 L114.5,363.1 L113.7,360.3 L120.6,360.0 L121.1,355.8 L126.2,354.3 L128.2,352.0 L132.2,351.2 L136.0,353.6 L139.7,352.3 L142.5,358.2 L145.9,358.2 L146.9,360.8 L150.8,360.2 L155.3,361.5 L159.9,360.5 L161.7,354.9 L168.8,344.5 L170.3,340.0 L186.0,349.4 L190.9,356.8 L190.2,364.6 L190.7,376.2 L194.7,390.1 L200.4,396.3 L204.3,397.5 L198.9,405.9 L198.2,408.4 L192.3,409.2 L184.0,407.2 L179.5,401.9 L172.0,395.7 L169.2,394.6 L163.5,396.7 L167.0,392.1 L165.3,390.1 L160.9,391.4 L160.9,388.3 L153.5,381.6 L149.3,386.0 L144.1,388.7 L139.1,395.8 L135.3,397.1 L133.4,401.3 L130.7,403.5 L123.8,402.7 L122.2,404.7 L121.6,416.8 L112.9,414.3 L107.2,414.9 L101.9,410.9 L98.3,413.3 L91.5,412.9 L88.0,414.2 L84.6,410.1 L85.0,403.4 L84.0,398.9 L85.0,396.0 L90.0,392.4 L88.9,388.4 L81.9,385.5 L77.0,382.5 L74.5,377.2 L75.1,373.8 L78.7,374.7 L83.2,372.6 L84.9,367.9 L87.3,366.6 L89.2,359.8 L88.7,356.2 L91.9,355.3Z",109.7,386.9],["강서구","M139.1,235.3 L138.6,241.7 L140.1,244.3 L151.4,251.1 L168.0,265.5 L185.0,279.5 L178.6,286.5 L179.9,291.4 L178.4,291.4 L172.1,283.7 L162.4,285.4 L157.7,284.1 L148.5,277.3 L145.5,289.7 L147.7,296.2 L147.2,304.0 L148.1,316.4 L126.4,319.8 L114.4,322.3 L105.7,304.3 L106.6,302.0 L103.8,294.6 L100.0,294.8 L99.1,290.2 L96.6,288.1 L94.8,294.5 L88.1,296.7 L77.3,296.8 L71.2,295.0 L69.7,292.3 L61.1,292.7 L56.0,297.1 L54.6,301.9 L48.8,305.5 L47.3,298.9 L48.9,295.3 L44.5,294.6 L44.5,291.0 L40.1,289.9 L37.3,286.5 L27.5,286.6 L21.1,281.8 L14.9,282.2 L10.0,273.8 L6.0,269.7 L11.4,269.4 L12.4,266.9 L22.9,258.1 L23.0,254.2 L19.9,248.5 L24.4,249.0 L28.2,247.0 L31.4,243.2 L30.3,240.3 L31.8,237.0 L41.4,230.1 L46.7,230.4 L46.5,224.9 L47.4,220.2 L50.4,219.9 L54.6,210.7 L57.5,209.3 L55.2,205.3 L55.5,202.2 L52.8,197.1 L52.0,192.1 L54.0,187.5 L56.2,187.0 L57.2,182.0 L59.0,181.0 L64.2,182.7 L79.3,199.6 L85.6,206.0 L94.8,210.5 L129.4,233.5 L139.1,235.3Z",91.9,258.4],["양천구","M88.1,296.7 L94.8,294.5 L96.6,288.1 L99.1,290.2 L100.0,294.8 L103.8,294.6 L106.6,302.0 L105.7,304.3 L114.4,322.3 L126.4,319.8 L148.1,316.4 L147.2,304.0 L147.7,296.2 L145.5,289.7 L148.5,277.3 L157.7,284.1 L162.4,285.4 L172.1,283.7 L178.4,291.4 L179.9,291.4 L181.5,291.8 L187.2,305.5 L187.6,310.3 L185.4,315.3 L183.2,314.7 L181.0,318.5 L173.5,322.7 L171.8,324.7 L170.8,330.1 L170.3,340.0 L168.8,344.5 L161.7,354.9 L159.9,360.5 L155.3,361.5 L150.8,360.2 L146.9,360.8 L145.9,358.2 L142.5,358.2 L139.7,352.3 L136.0,353.6 L132.2,351.2 L128.2,352.0 L126.2,354.3 L121.1,355.8 L120.6,360.0 L113.7,360.3 L114.5,363.1 L108.5,365.9 L102.3,360.9 L98.1,355.4 L91.9,355.3 L90.7,351.1 L91.5,346.4 L89.6,341.0 L92.9,334.6 L92.5,329.0 L97.1,322.0 L95.5,316.7 L93.0,316.3 L87.6,307.4 L88.1,296.7Z",150.3,335.8],["마포구","M204.2,231.2 L202.0,233.8 L206.6,237.5 L228.1,249.6 L236.5,252.2 L240.2,255.7 L238.0,259.9 L237.9,263.9 L252.6,270.6 L258.6,268.2 L281.5,266.3 L283.9,267.8 L287.9,263.8 L290.2,268.2 L288.2,270.2 L289.2,277.1 L291.4,280.4 L288.5,282.3 L286.1,286.5 L283.6,288.1 L281.7,294.7 L273.3,304.6 L264.4,307.1 L262.2,317.1 L249.5,304.7 L241.6,303.4 L208.6,294.3 L200.7,290.5 L185.0,279.5 L168.0,265.5 L151.4,251.1 L140.1,244.3 L138.6,241.7 L139.1,235.3 L139.3,233.5 L144.8,233.1 L147.4,231.6 L150.3,233.7 L153.8,230.3 L157.7,229.6 L165.1,226.3 L166.9,221.1 L166.3,218.1 L169.6,213.7 L171.4,208.1 L174.2,205.8 L184.5,216.9 L190.0,221.6 L193.0,222.9 L197.0,228.6 L202.1,233.0 L204.2,231.2Z",211.1,268.0],["서대문구","M272.0,175.1 L275.3,177.4 L276.5,181.0 L275.4,188.7 L277.3,192.0 L281.7,192.6 L280.5,198.2 L283.4,204.8 L283.4,207.5 L281.0,217.1 L285.3,221.1 L279.7,224.3 L276.5,227.6 L295.3,251.0 L299.5,258.1 L295.6,259.4 L290.9,263.0 L287.9,263.8 L283.9,267.8 L281.5,266.3 L258.6,268.2 L252.6,270.6 L237.9,263.9 L238.0,259.9 L240.2,255.7 L236.5,252.2 L228.1,249.6 L206.6,237.5 L202.0,233.8 L204.2,231.2 L217.7,214.7 L222.9,215.5 L222.4,219.9 L231.8,218.3 L233.9,212.5 L237.1,212.6 L240.0,210.4 L239.7,206.6 L241.2,202.5 L248.0,195.9 L258.0,191.8 L259.2,183.7 L260.5,180.7 L264.1,180.7 L267.3,175.2 L272.0,175.1Z",251.6,233.4],["은평구","M302.7,131.0 L299.0,134.7 L285.1,137.9 L281.1,143.5 L274.5,144.5 L274.0,150.4 L272.5,155.2 L270.5,157.3 L272.0,160.2 L272.8,167.6 L271.1,173.5 L272.0,175.1 L267.3,175.2 L264.1,180.7 L260.5,180.7 L259.2,183.7 L258.0,191.8 L248.0,195.9 L241.2,202.5 L239.7,206.6 L240.0,210.4 L237.1,212.6 L233.9,212.5 L231.8,218.3 L222.4,219.9 L222.9,215.5 L217.7,214.7 L204.2,231.2 L202.1,233.0 L197.0,228.6 L193.0,222.9 L190.0,221.6 L184.5,216.9 L174.2,205.8 L178.3,200.6 L181.5,200.6 L178.8,205.5 L181.4,210.0 L187.4,210.3 L190.0,209.0 L195.4,210.0 L199.5,207.7 L198.3,202.7 L202.4,198.3 L201.3,194.2 L201.8,190.5 L200.1,183.7 L202.7,182.5 L202.4,171.3 L201.1,166.3 L204.6,155.4 L207.1,154.6 L210.1,149.7 L208.9,145.9 L212.2,142.0 L212.7,138.0 L209.1,130.5 L215.3,124.5 L214.4,119.4 L216.5,115.2 L217.6,109.3 L210.7,105.6 L211.7,103.5 L219.6,108.5 L230.2,107.0 L236.2,103.6 L241.1,99.0 L249.2,97.9 L252.8,95.4 L257.6,86.9 L262.3,84.2 L267.5,82.8 L268.2,85.5 L273.2,90.0 L277.7,89.4 L281.1,94.1 L282.4,100.4 L286.0,102.0 L288.8,110.7 L292.1,111.5 L298.4,119.4 L298.3,123.3 L302.7,131.0Z",243.9,148.8],["노원구","M494.7,151.7 L488.7,153.6 L486.2,156.6 L481.0,158.5 L471.0,153.5 L466.2,152.7 L459.5,154.9 L445.5,161.1 L440.6,161.2 L436.6,163.8 L432.0,163.4 L420.9,152.9 L414.8,145.2 L411.8,140.7 L402.6,132.8 L406.1,128.9 L407.7,122.7 L415.1,108.3 L421.9,115.6 L423.3,106.2 L421.0,97.3 L420.7,88.6 L417.1,79.8 L416.7,74.2 L413.1,64.4 L413.6,57.1 L415.5,49.3 L417.6,36.0 L415.9,32.0 L421.5,27.9 L424.6,27.4 L431.4,28.8 L436.5,26.8 L442.6,18.7 L447.7,18.5 L454.0,15.0 L460.4,15.0 L464.0,19.3 L466.8,26.0 L479.3,28.1 L481.2,34.3 L476.1,41.8 L474.8,46.1 L477.4,50.8 L478.6,56.4 L480.2,57.7 L480.7,62.4 L478.1,69.5 L481.3,77.5 L480.4,81.7 L466.9,89.0 L476.3,90.1 L478.0,93.9 L475.5,99.1 L479.0,107.0 L483.8,107.8 L487.3,106.7 L498.0,108.6 L503.7,116.6 L504.3,125.7 L502.3,134.0 L494.1,140.7 L494.0,143.7 L491.6,148.0 L494.7,151.7Z",439.7,74.4],["도봉구","M415.9,32.0 L417.6,36.0 L415.5,49.3 L413.6,57.1 L413.1,64.4 L416.7,74.2 L417.1,79.8 L420.7,88.6 L421.0,97.3 L423.3,106.2 L421.9,115.6 L415.1,108.3 L407.7,122.7 L406.1,128.9 L402.6,132.8 L398.3,128.0 L396.1,122.9 L392.6,120.9 L390.0,114.1 L382.4,107.8 L378.2,103.5 L372.1,100.6 L365.5,100.6 L362.1,98.1 L361.1,94.9 L363.0,82.6 L364.9,78.0 L365.6,68.7 L369.7,62.8 L367.0,57.9 L363.0,53.0 L360.2,45.9 L355.5,45.2 L355.0,36.2 L355.9,31.7 L354.7,28.2 L355.9,18.0 L360.3,11.7 L363.7,11.6 L365.9,6.6 L370.8,6.0 L374.8,9.2 L378.8,9.5 L383.4,7.5 L385.0,10.3 L385.8,15.4 L387.8,21.3 L389.6,23.4 L394.5,22.6 L402.9,16.9 L404.8,19.8 L408.5,22.2 L413.3,19.4 L415.9,32.0Z",390.7,79.1],["강북구","M355.0,36.2 L355.5,45.2 L360.2,45.9 L363.0,53.0 L367.0,57.9 L369.7,62.8 L365.6,68.7 L364.9,78.0 L363.0,82.6 L361.1,94.9 L362.1,98.1 L365.5,100.6 L372.1,100.6 L378.2,103.5 L382.4,107.8 L390.0,114.1 L392.6,120.9 L396.1,122.9 L398.3,128.0 L402.6,132.8 L411.8,140.7 L414.8,145.2 L410.2,148.6 L406.2,155.6 L400.3,161.1 L395.9,166.8 L386.7,172.9 L386.4,167.1 L381.0,166.5 L375.0,169.0 L370.7,164.5 L364.3,161.2 L358.5,159.6 L355.3,155.9 L353.9,151.4 L354.4,146.1 L343.1,142.8 L338.2,136.8 L334.6,135.1 L333.4,131.4 L330.6,131.5 L322.5,125.3 L321.1,123.2 L323.3,116.7 L319.1,110.5 L321.6,106.2 L319.7,99.3 L316.1,94.8 L313.9,90.1 L314.4,87.0 L321.6,82.1 L326.2,74.0 L332.9,71.8 L334.1,66.5 L334.7,58.7 L333.0,49.0 L331.3,45.7 L334.3,44.1 L340.1,37.8 L348.2,35.5 L355.0,36.2Z",370.3,128.6],["성북구","M307.4,132.6 L310.6,128.8 L316.6,126.6 L321.1,123.2 L322.5,125.3 L330.6,131.5 L333.4,131.4 L334.6,135.1 L338.2,136.8 L343.1,142.8 L354.4,146.1 L353.9,151.4 L355.3,155.9 L358.5,159.6 L364.3,161.2 L370.7,164.5 L375.0,169.0 L381.0,166.5 L386.4,167.1 L386.7,172.9 L395.9,166.8 L400.3,161.1 L406.2,155.6 L410.2,148.6 L414.8,145.2 L420.9,152.9 L432.0,163.4 L436.6,163.8 L440.6,161.2 L445.5,161.1 L446.0,177.1 L444.2,172.5 L441.5,172.5 L441.7,177.0 L436.9,179.4 L432.2,180.1 L428.0,187.5 L425.4,186.6 L417.7,189.5 L415.2,187.4 L411.4,196.1 L406.3,196.1 L401.3,198.1 L399.1,205.2 L395.3,207.6 L384.9,221.3 L376.3,229.1 L374.5,227.6 L369.3,228.2 L366.6,222.2 L364.2,221.5 L355.8,224.8 L353.2,221.8 L353.0,216.0 L351.6,213.1 L346.6,209.2 L344.5,203.2 L336.9,203.4 L335.1,205.2 L330.8,205.0 L323.7,202.9 L320.0,200.5 L317.3,196.9 L316.7,190.9 L321.5,190.4 L325.5,187.2 L322.9,176.5 L324.4,170.3 L324.0,162.8 L318.5,159.2 L315.7,148.2 L313.3,144.9 L313.8,136.6 L309.7,137.2 L307.4,132.6Z",370.8,195.0],["중랑구","M445.5,161.1 L459.5,154.9 L466.2,152.7 L471.0,153.5 L481.0,158.5 L486.2,156.6 L488.7,153.6 L494.7,151.7 L502.8,152.0 L511.0,157.2 L510.4,160.1 L511.7,168.2 L510.4,173.3 L512.8,175.6 L512.4,181.1 L506.4,189.5 L506.7,191.2 L512.9,198.4 L512.1,200.2 L505.7,201.5 L501.6,208.9 L499.9,217.1 L488.6,218.7 L490.5,222.4 L490.4,228.6 L488.0,233.3 L487.9,237.2 L485.8,239.1 L473.9,244.5 L462.7,241.2 L455.8,240.3 L455.2,229.2 L453.6,223.1 L445.2,209.7 L442.7,196.3 L443.6,192.7 L447.0,187.4 L447.4,184.3 L446.0,177.1 L445.5,161.1Z",477.2,187.9],["동대문구","M376.3,229.1 L384.9,221.3 L395.3,207.6 L399.1,205.2 L401.3,198.1 L406.3,196.1 L411.4,196.1 L415.2,187.4 L417.7,189.5 L425.4,186.6 L428.0,187.5 L432.2,180.1 L436.9,179.4 L441.7,177.0 L441.5,172.5 L444.2,172.5 L446.0,177.1 L447.4,184.3 L447.0,187.4 L443.6,192.7 L442.7,196.3 L445.2,209.7 L453.6,223.1 L455.2,229.2 L455.8,240.3 L446.5,261.7 L444.6,260.7 L428.3,257.7 L426.6,256.8 L411.9,243.0 L403.6,238.2 L397.5,238.4 L390.0,243.0 L385.7,243.8 L376.6,240.5 L376.3,229.1Z",422.1,219.4],["광진구","M455.8,240.3 L462.7,241.2 L473.9,244.5 L485.8,239.1 L487.9,237.2 L492.5,242.0 L491.3,244.3 L489.3,257.4 L488.2,261.7 L501.7,262.1 L505.3,261.2 L506.5,264.3 L506.4,273.8 L503.8,284.3 L500.2,291.7 L490.4,308.8 L484.7,320.3 L475.4,321.8 L464.0,326.1 L454.4,327.7 L447.6,327.4 L439.1,324.9 L424.2,317.7 L439.0,285.0 L448.8,262.8 L446.5,261.7 L455.8,240.3Z",470.2,286.3],["성동구","M376.6,240.5 L385.7,243.8 L390.0,243.0 L397.5,238.4 L403.6,238.2 L411.9,243.0 L426.6,256.8 L428.3,257.7 L444.6,260.7 L446.5,261.7 L448.8,262.8 L439.0,285.0 L424.2,317.7 L413.5,311.4 L410.4,308.4 L409.0,311.5 L385.9,300.0 L378.8,302.2 L373.1,306.8 L364.3,299.9 L356.7,298.7 L355.1,294.6 L355.5,290.7 L356.9,283.4 L359.8,282.5 L367.2,273.7 L368.1,269.0 L371.3,266.2 L375.9,265.6 L377.1,259.7 L380.8,256.3 L381.4,252.7 L377.0,252.4 L376.6,240.5Z",404.3,275.9],["용산구","M355.5,290.7 L355.1,294.6 L356.7,298.7 L364.3,299.9 L373.1,306.8 L360.1,319.9 L354.8,325.4 L351.8,331.3 L348.5,334.6 L340.3,340.1 L327.9,347.3 L325.0,345.5 L318.0,345.9 L314.6,348.4 L292.4,347.2 L282.0,342.6 L276.3,338.6 L272.0,334.1 L268.5,327.6 L266.7,321.4 L262.2,317.1 L264.4,307.1 L273.3,304.6 L281.7,294.7 L283.6,288.1 L286.1,286.5 L288.5,282.3 L291.4,280.4 L289.2,277.1 L294.0,272.4 L303.2,272.8 L309.4,274.2 L310.4,270.8 L315.2,273.7 L319.8,274.4 L322.2,273.1 L325.6,277.1 L329.2,277.3 L336.4,284.8 L341.0,280.0 L347.0,280.6 L349.2,279.2 L350.1,286.8 L353.5,291.0 L355.5,290.7Z",313.0,311.6],["중구","M376.6,240.5 L377.0,252.4 L381.4,252.7 L380.8,256.3 L377.1,259.7 L375.9,265.6 L371.3,266.2 L368.1,269.0 L367.2,273.7 L359.8,282.5 L356.9,283.4 L355.5,290.7 L353.5,291.0 L350.1,286.8 L349.2,279.2 L347.0,280.6 L341.0,280.0 L336.4,284.8 L329.2,277.3 L325.6,277.1 L322.2,273.1 L319.8,274.4 L315.2,273.7 L310.4,270.8 L309.4,274.2 L303.2,272.8 L294.0,272.4 L289.2,277.1 L288.2,270.2 L290.2,268.2 L287.9,263.8 L290.9,263.0 L295.6,259.4 L299.5,258.1 L295.3,251.0 L298.7,246.9 L304.3,245.1 L311.3,245.0 L327.2,247.1 L338.4,246.0 L345.4,244.4 L365.7,244.0 L372.4,240.5 L376.6,240.5Z",351.3,261.9],["종로구","M302.7,131.0 L307.4,132.6 L309.7,137.2 L313.8,136.6 L313.3,144.9 L315.7,148.2 L318.5,159.2 L324.0,162.8 L324.4,170.3 L322.9,176.5 L325.5,187.2 L321.5,190.4 L316.7,190.9 L317.3,196.9 L320.0,200.5 L323.7,202.9 L330.8,205.0 L335.1,205.2 L336.9,203.4 L344.5,203.2 L346.6,209.2 L351.6,213.1 L353.0,216.0 L353.2,221.8 L355.8,224.8 L364.2,221.5 L366.6,222.2 L369.3,228.2 L374.5,227.6 L376.3,229.1 L376.6,240.5 L372.4,240.5 L365.7,244.0 L345.4,244.4 L338.4,246.0 L327.2,247.1 L311.3,245.0 L304.3,245.1 L298.7,246.9 L295.3,251.0 L276.5,227.6 L279.7,224.3 L285.3,221.1 L281.0,217.1 L283.4,207.5 L283.4,204.8 L280.5,198.2 L281.7,192.6 L277.3,192.0 L275.4,188.7 L276.5,181.0 L275.3,177.4 L272.0,175.1 L271.1,173.5 L272.8,167.6 L272.0,160.2 L270.5,157.3 L272.5,155.2 L274.0,150.4 L274.5,144.5 L281.1,143.5 L285.1,137.9 L299.0,134.7 L302.7,131.0Z",299.3,191.7]]};

/* ------------------------------------------------------------------
   맞춤 매물 의뢰서 (lease-request.html)
   - 서울 25개 구 지도 선택 / 경기·인천 / 직접 입력
   - 면적·보증금·월 임대료 범위 선택 또는 직접 입력
   - 용도별 필요 조건, 실시간 의뢰서 요약
   - 접수는 app.js의 form.lead 처리(/api/lead)를 그대로 사용합니다
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var form = document.getElementById('lrForm');
  if (!form) return;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var MAX_REGION = 6;

  /* ---------- 1. 희망 지역 ---------- */
  var GROUPS = [
    { name: '도심권', gu: ['종로구', '중구', '용산구'] },
    { name: '동남권', gu: ['강남구', '서초구', '송파구', '강동구'] },
    { name: '서북권', gu: ['마포구', '서대문구', '은평구'] },
    { name: '서남권', gu: ['영등포구', '동작구', '관악구', '구로구', '금천구', '양천구', '강서구'] },
    { name: '동북권', gu: ['성동구', '광진구', '동대문구', '중랑구', '성북구', '강북구', '도봉구', '노원구'] }
  ];
  var QUICK = [
    { label: '강남·서초 (GBD)', gu: ['강남구', '서초구'] },
    { label: '종로·중구 (CBD)', gu: ['종로구', '중구'] },
    { label: '여의도·마포 (YBD)', gu: ['영등포구', '마포구'] },
    { label: '성수·건대', gu: ['성동구', '광진구'] },
    { label: '잠실·송파', gu: ['송파구', '강동구'] },
    { label: '용산', gu: ['용산구'] }
  ];
  var METRO = ['성남(분당·판교)', '하남', '고양(일산)', '수원', '용인(수지)', '안양(평촌)', '부천', '광명', '과천', '화성(동탄)', '김포', '남양주', '인천'];
  var regions = []; // 선택 순서대로 [{v:'강남구', t:'gu'|'metro'|'free'}]

  function hasRegion(v) { return regions.some(function (r) { return r.v === v; }); }
  function addRegion(v, t) {
    v = String(v || '').trim().slice(0, 40);
    if (!v || hasRegion(v)) return true;
    if (regions.length >= MAX_REGION) { flash('#lrRegionMsg', '희망 지역은 ' + MAX_REGION + '곳까지 고를 수 있습니다. 먼저 고른 곳을 빼고 다시 선택해 주세요.'); return false; }
    regions.push({ v: v, t: t });
    return true;
  }
  function removeRegion(v) { regions = regions.filter(function (r) { return r.v !== v; }); }
  function toggleRegion(v, t) { if (hasRegion(v)) removeRegion(v); else addRegion(v, t); renderRegions(); }

  // 지도 그리기
  var svgNS = 'http://www.w3.org/2000/svg';
  var mapBox = $('#lrMap');
  if (mapBox && typeof SEOUL_GU_MAP !== 'undefined') {
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + SEOUL_GU_MAP.w + ' ' + SEOUL_GU_MAP.h);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', '서울 25개 구 지도. 구를 눌러 희망 지역으로 선택합니다.');
    var gShapes = document.createElementNS(svgNS, 'g');
    var gLabels = document.createElementNS(svgNS, 'g');
    gLabels.setAttribute('aria-hidden', 'true');
    SEOUL_GU_MAP.gu.forEach(function (g) {
      var p = document.createElementNS(svgNS, 'path');
      p.setAttribute('d', g[1]);
      p.setAttribute('data-gu', g[0]);
      p.setAttribute('tabindex', '0');
      p.setAttribute('role', 'checkbox');
      p.setAttribute('aria-checked', 'false');
      p.setAttribute('aria-label', '서울 ' + g[0]);
      var tt = document.createElementNS(svgNS, 'title'); tt.textContent = g[0]; p.appendChild(tt);
      p.addEventListener('click', function () { toggleRegion(g[0], 'gu'); });
      p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRegion(g[0], 'gu'); } });
      gShapes.appendChild(p);
      var tx = document.createElementNS(svgNS, 'text');
      tx.setAttribute('x', g[2]); tx.setAttribute('y', g[3]);
      tx.setAttribute('data-gu', g[0]);
      tx.textContent = g[0].length > 3 ? g[0].replace(/구$/, '') : g[0];
      gLabels.appendChild(tx);
    });
    svg.appendChild(gShapes); svg.appendChild(gLabels);
    mapBox.appendChild(svg);
  }

  // 자주 찾는 권역
  var quickBox = $('#lrQuick');
  if (quickBox) {
    quickBox.innerHTML = QUICK.map(function (q, i) { return '<button type="button" class="lr-chip" data-q="' + i + '">' + esc(q.label) + '</button>'; }).join('');
    quickBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]'); if (!b) return;
      var q = QUICK[+b.getAttribute('data-q')];
      var all = q.gu.every(hasRegion);
      if (all) q.gu.forEach(removeRegion); else q.gu.forEach(function (g) { addRegion(g, 'gu'); });
      renderRegions();
    });
  }
  // 구 이름 목록 (생활권별)
  var listBox = $('#lrGuList');
  if (listBox) {
    listBox.innerHTML = GROUPS.map(function (g) {
      return '<div class="lr-gugrp"><span class="lr-gugrp-t">' + g.name + '</span><div class="lr-chips">' +
        g.gu.map(function (n) { return '<button type="button" class="lr-chip sm" data-gu="' + n + '" aria-pressed="false">' + n + '</button>'; }).join('') + '</div></div>';
    }).join('');
    listBox.addEventListener('click', function (e) { var b = e.target.closest('[data-gu]'); if (b) toggleRegion(b.getAttribute('data-gu'), 'gu'); });
  }
  var guDetails = $('#lrGuDetails');
  if (guDetails && window.matchMedia && window.matchMedia('(max-width: 720px)').matches) guDetails.open = true;
  // 경기·인천
  var metroBox = $('#lrMetro');
  if (metroBox) {
    metroBox.innerHTML = METRO.map(function (n) { return '<button type="button" class="lr-chip" data-metro="' + esc(n) + '" aria-pressed="false">' + esc(n) + '</button>'; }).join('');
    metroBox.addEventListener('click', function (e) { var b = e.target.closest('[data-metro]'); if (b) toggleRegion(b.getAttribute('data-metro'), 'metro'); });
  }
  // 직접 입력
  var freeIn = $('#lrFree'), freeBtn = $('#lrFreeAdd');
  function addFree() { if (!freeIn.value.trim()) { freeIn.focus(); return; } if (addRegion(freeIn.value, 'free')) freeIn.value = ''; renderRegions(); freeIn.focus(); }
  if (freeIn) {
    freeIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addFree(); } });
    freeBtn.addEventListener('click', addFree);
  }
  // 지역 탭
  var rtabs = $$('.lr-rtab');
  function setRegionTab(key) {
    rtabs.forEach(function (t) { var on = t.getAttribute('data-rt') === key; t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    $$('.lr-rpane').forEach(function (p) { p.hidden = p.getAttribute('data-rp') !== key; });
  }
  rtabs.forEach(function (t, i) {
    t.addEventListener('click', function () { setRegionTab(t.getAttribute('data-rt')); });
    t.addEventListener('keydown', function (e) {
      var n = null; if (e.key === 'ArrowRight') n = rtabs[(i + 1) % rtabs.length]; if (e.key === 'ArrowLeft') n = rtabs[(i - 1 + rtabs.length) % rtabs.length];
      if (n) { e.preventDefault(); setRegionTab(n.getAttribute('data-rt')); n.focus(); }
    });
  });
  // 선택 결과 표시
  var selBox = $('#lrSelected');
  if (selBox) selBox.addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) { removeRegion(b.getAttribute('data-rm')); renderRegions(); } });
  function renderRegions() {
    $$('#lrMap path').forEach(function (p) { var on = hasRegion(p.getAttribute('data-gu')); p.classList.toggle('on', on); p.setAttribute('aria-checked', on ? 'true' : 'false'); });
    $$('#lrMap text').forEach(function (t) { t.classList.toggle('on', hasRegion(t.getAttribute('data-gu'))); });
    $$('[data-gu].lr-chip,[data-metro]').forEach(function (b) { var v = b.getAttribute('data-gu') || b.getAttribute('data-metro'); var on = hasRegion(v); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    $$('#lrQuick [data-q]').forEach(function (b) { var on = QUICK[+b.getAttribute('data-q')].gu.every(hasRegion); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (selBox) {
      selBox.innerHTML = regions.length
        ? regions.map(function (r) { return '<span class="lr-tag">' + esc((r.t === 'gu' ? '서울 ' : '') + r.v) + '<button type="button" data-rm="' + esc(r.v) + '" aria-label="' + esc(r.v) + ' 빼기">&times;</button></span>'; }).join('')
        : '<span class="lr-empty">아직 고른 지역이 없습니다. 지도에서 구를 누르거나 권역·직접 입력으로 추가해 주세요.</span>';
    }
    var cnt = $('#lrRegionCount'); if (cnt) cnt.textContent = regions.length ? regions.length + '/' + MAX_REGION : '';
    if (regions.length) clearErr('region');
    sync();
  }

  /* ---------- 2. 용도와 조건 ---------- */
  var COND_BASE = ['대로변·코너', '주차', '엘리베이터', '내부 화장실', '간판 노출'];
  var COND = {
    office: ['회의실 구성', '냉난방 개별 사용', '24시간 출입', '인테리어 완비', '공용 라운지'],
    fnb: ['배기·덕트', '가스', '급배수', '전기 증설', '테라스·야외석', '기존 시설 인수'],
    retail: ['넓은 전면', '쇼윈도', '유동 많은 길', '창고 공간'],
    beauty: ['급배수(샴푸대)', '전기 증설', '채광', '기존 시설 인수'],
    popup: ['단기 계약', '집기·연출물 반입', '즉시 사용', '전면 노출'],
    showroom: ['높은 층고', '채광', '화물 엘리베이터', '촬영 가능'],
    edu: ['교육시설 용도 가능', '남녀 화장실 분리', '방음'],
    clinic: ['의료시설 용도 가능', '엘리베이터', '주차 여유'],
    fitness: ['높은 층고', '방음·진동 대책', '샤워실', '넓은 기둥 간격'],
    warehouse: ['화물차 진입', '하역 공간', '높은 층고', '바닥 하중'],
    etc: []
  };
  var USE_HINT = {
    office: '예: IT 개발사 15명, 회의실 2개와 대표실 필요',
    fnb: '예: 스페셜티 카페 20석, 로스팅 없음',
    retail: '예: 여성 의류 편집숍, 피팅룸 2개',
    beauty: '예: 헤어살롱, 의자 6석과 샴푸대 3개',
    popup: '예: 화장품 브랜드 팝업, 2주 운영',
    showroom: '예: 가구 쇼룸 겸 촬영 스튜디오',
    edu: '예: 초등 영어학원, 강의실 4개',
    clinic: '예: 피부과 의원, 진료실 3개',
    fitness: '예: 필라테스 스튜디오, 기구 8대',
    warehouse: '예: 온라인 쇼핑몰 재고 보관·출고',
    etc: '어떤 공간인지 간단히 적어 주세요'
  };
  var NO_PREMIUM = { office: 1, warehouse: 1, popup: 1 }; // 권리금 질문을 숨길 용도
  var useVal = '';
  var condBox = $('#lrCond');
  function renderCond(keep) {
    var opts = COND_BASE.concat(COND[useVal] || []);
    var prev = keep || $$('input[name="필요 조건"]:checked', condBox).map(function (i) { return i.value; });
    condBox.innerHTML = opts.map(function (o) {
      return '<label class="lr-check"><input type="checkbox" name="필요 조건" value="' + esc(o) + '"' + (prev.indexOf(o) > -1 ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
    }).join('');
  }
  function setUse(v) {
    useVal = v;
    var hint = $('#lrUseDetail'); if (hint) hint.placeholder = USE_HINT[v] || '어떤 공간인지 간단히 적어 주세요';
    $$('[data-for-use]').forEach(function (el) { el.hidden = el.getAttribute('data-for-use').split(' ').indexOf(v) < 0; });
    $$('[data-for-use]').forEach(function (el) { $$('input,select,textarea', el).forEach(function (i) { i.disabled = el.hidden; }); });
    var prem = $('#lrPremium'); if (prem) { prem.hidden = !!NO_PREMIUM[v]; $$('input', prem).forEach(function (i) { i.disabled = prem.hidden; }); }
    var rentHint = $('#lrRentHint'); if (rentHint) rentHint.textContent = v === 'popup' ? '팝업은 기간 전체 이용료로 적어 주셔도 됩니다. 관리비·부가세는 따로 확인합니다.' : '관리비와 부가세를 뺀 금액 기준입니다.';
    renderCond();
    clearErr('use');
    sync();
  }
  $$('input[name="예상 용도"]').forEach(function (r) { r.addEventListener('change', function () { setUse(r.getAttribute('data-use')); }); });
  renderCond([]);

  /* ---------- 3·4. 범위 선택 + 직접 입력 ---------- */
  function rangeGroup(name, opts) {
    // opts: {chips:'#id', custom:'#id', min:'#id', max:'#id', unit:'평'|'만원', out:'#hidden'}
    var box = $(opts.chips), cus = $(opts.custom);
    function selected() { var c = $('input[type=radio]:checked', box); return c ? c.value : ''; }
    function refresh() {
      var v = selected();
      cus.hidden = v !== '직접 입력';
      sync();
    }
    $$('input[type=radio]', box).forEach(function (r) { r.addEventListener('change', function () { refresh(); if (r.value === '직접 입력') { var m = $(opts.min); if (m) m.focus(); } }); });
    [opts.min, opts.max].forEach(function (s) { var el = $(s); if (el) el.addEventListener('input', function () { el.value = el.value.replace(/[^0-9.]/g, ''); sync(); }); });
    return { selected: selected, refresh: refresh };
  }
  var areaG = rangeGroup('area', { chips: '#lrArea', custom: '#lrAreaCustom', min: '#lrAreaMin', max: '#lrAreaMax' });
  var depG = rangeGroup('dep', { chips: '#lrDep', custom: '#lrDepCustom', min: '#lrDepMin', max: '#lrDepMax' });
  var rentG = rangeGroup('rent', { chips: '#lrRent', custom: '#lrRentCustom', min: '#lrRentMin', max: '#lrRentMax' });

  function num(s) { var n = parseFloat(String(s || '').replace(/,/g, '')); return isFinite(n) && n > 0 ? n : 0; }
  function won(man) { // 만원 단위 → 읽기 쉬운 금액
    if (!man) return '';
    var eok = Math.floor(man / 10000), rest = Math.round(man % 10000);
    if (eok && rest) return eok + '억 ' + rest.toLocaleString('ko-KR') + '만';
    if (eok) return eok + '억';
    return rest.toLocaleString('ko-KR') + '만';
  }
  function rangeText(lo, hi, f, unit) {
    if (lo && hi) { if (hi < lo) { var t = lo; lo = hi; hi = t; } return f(lo) + '~' + f(hi) + unit; }
    if (lo) return f(lo) + unit + ' 이상';
    if (hi) return f(hi) + unit + ' 이하';
    return '';
  }
  function areaText() {
    var v = areaG.selected(); if (!v) return '';
    if (v === '직접 입력') {
      var lo = num($('#lrAreaMin').value), hi = num($('#lrAreaMax').value);
      var t = rangeText(lo, hi, function (n) { return String(n); }, '평'); if (!t) return '';
      var m2 = rangeText(lo && Math.round(lo * 3.3058), hi && Math.round(hi * 3.3058), function (n) { return String(n); }, '㎡');
      return t + ' (약 ' + m2 + ')';
    }
    return v;
  }
  function areaBasis() { var b = $('input[name="_면적기준"]:checked'); return b ? b.value : ''; }
  function moneyText(g, minSel, maxSel) {
    var v = g.selected(); if (!v) return '';
    if (v === '직접 입력') { return rangeText(num($(minSel).value), num($(maxSel).value), won, ' 원'); }
    return v;
  }
  // 직접 입력한 면적의 ㎡ 환산 미리보기
  function areaPreview() {
    var out = $('#lrAreaConv'); if (!out) return;
    var lo = num($('#lrAreaMin').value), hi = num($('#lrAreaMax').value);
    out.textContent = (lo || hi) ? '약 ' + rangeText(lo && Math.round(lo * 3.3058), hi && Math.round(hi * 3.3058), String, '㎡') + ' (1평 = 3.3058㎡)' : '1평 = 3.3058㎡';
  }
  function moneyPreview(minSel, maxSel, outSel) {
    var out = $(outSel); if (!out) return;
    var t = rangeText(num($(minSel).value), num($(maxSel).value), won, ' 원');
    out.textContent = t ? '= ' + t : '만 원 단위로 적어 주세요';
  }

  /* ---------- 연락처 ---------- */
  var tel = $('#lrTel');
  if (tel) tel.addEventListener('input', function () {
    var d = tel.value.replace(/[^0-9]/g, '').slice(0, 11);
    if (/^02/.test(d)) tel.value = d.length > 9 ? d.replace(/^(02)(\d{4})(\d+)/, '$1-$2-$3') : d.replace(/^(02)(\d{3})(\d*)/, '$1-$2-$3').replace(/-$/, '');
    else tel.value = d.length > 10 ? d.replace(/^(\d{3})(\d{4})(\d+)/, '$1-$2-$3') : d.length > 6 ? d.replace(/^(\d{3})(\d{3})(\d*)/, '$1-$2-$3') : d.length > 3 ? d.replace(/^(\d{3})(\d*)/, '$1-$2') : d;
    clearErr('tel');
  });

  /* ---------- 숨은 필드 동기화 + 요약 ---------- */
  function setHidden(name, value) {
    var el = form.querySelector('input[type=hidden][name="' + name + '"]');
    if (!el) { el = document.createElement('input'); el.type = 'hidden'; el.name = name; form.appendChild(el); }
    el.value = value || '';
  }
  function radioVal(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
  function checks(name) { return $$('input[name="' + name + '"]:checked', form).map(function (i) { return i.value; }); }

  function collect() {
    var detail = ($('#lrUseDetail') || {}).value || '';
    var spot = ($('#lrSpot') || {}).value || '';
    var area = areaText(), basis = areaBasis();
    return {
      region: regions.map(function (r) { return (r.t === 'gu' ? '서울 ' : '') + r.v; }).join(', '),
      spot: spot.trim(),
      use: radioVal('예상 용도'),
      detail: detail.trim(),
      area: area ? area + (basis && basis !== '잘 모르겠음' ? ' · ' + basis : '') : '',
      dep: moneyText(depG, '#lrDepMin', '#lrDepMax'),
      rent: moneyText(rentG, '#lrRentMin', '#lrRentMax'),
      move: radioVal('입주 희망 시기'),
      floor: radioVal('희망 층'),
      cond: checks('필요 조건'),
      premium: $('#lrPremium') && !$('#lrPremium').hidden ? radioVal('권리금') : ''
    };
  }
  function sync() {
    var c = collect();
    setHidden('희망 지역', c.region);
    setHidden('희망 면적', c.area);
    setHidden('예상 보증금', c.dep);
    setHidden('예상 월 임대료', c.rent);
    areaPreview();
    moneyPreview('#lrDepMin', '#lrDepMax', '#lrDepConv');
    moneyPreview('#lrRentMin', '#lrRentMax', '#lrRentConv');
    renderSummary(c);
    markSteps(c);
  }

  var ROWS = [
    ['희망 지역', function (c) { return c.region + (c.spot ? (c.region ? ' · ' : '') + c.spot : ''); }],
    ['예상 용도', function (c) { return c.use + (c.detail ? ' · ' + c.detail : ''); }],
    ['희망 면적', function (c) { return c.area; }],
    ['예상 보증금', function (c) { return c.dep; }],
    ['예상 월 임대료', function (c) { return c.rent; }],
    ['입주 희망 시기', function (c) { return c.move; }],
    ['필요 조건', function (c) { return [c.floor && c.floor !== '상관없음' ? c.floor : ''].concat(c.cond).filter(Boolean).join(', '); }]
  ];
  function summaryHtml(c, emptyText) {
    return ROWS.map(function (r) {
      var v = r[1](c);
      return '<div class="lr-row"><dt>' + r[0] + '</dt><dd' + (v ? '' : ' class="none"') + '>' + esc(v || emptyText) + '</dd></div>';
    }).join('');
  }
  function renderSummary(c) {
    var done = ROWS.slice(0, 6).filter(function (r) { return !!r[1](c); }).length;
    $$('.lr-sumlist').forEach(function (dl) { dl.innerHTML = summaryHtml(c, '선택 전'); });
    $$('.lr-progress').forEach(function (p) {
      p.querySelector('b').textContent = done + '/6';
      p.querySelector('i').style.width = Math.round(done / 6 * 100) + '%';
    });
  }
  function markSteps(c) {
    var map = { 1: !!c.region || !!c.spot, 2: !!c.use, 3: !!c.area, 4: !!(c.dep || c.rent), 5: !!(($('#lrName') || {}).value && tel && tel.value.replace(/\D/g, '').length >= 9) };
    $$('.lr-step').forEach(function (s) { s.classList.toggle('done', !!map[s.getAttribute('data-step')]); });
  }
  form.addEventListener('input', sync);
  form.addEventListener('change', sync);

  /* ---------- 오류 표시 ---------- */
  function flash(sel, msg) { var el = $(sel); if (!el) return; el.textContent = msg; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(function () { el.hidden = true; }, 4200); }
  function showErr(key, msg) { var el = $('[data-err="' + key + '"]'); if (el) { el.textContent = msg; el.hidden = false; } }
  function clearErr(key) { var el = $('[data-err="' + key + '"]'); if (el) el.hidden = true; }

  /* ---------- 제출 전 점검 (app.js보다 먼저 실행) ---------- */
  form.addEventListener('submit', function (e) {
    sync();
    var c = collect(), first = null;
    if (!c.region && !c.spot) { showErr('region', '희망 지역을 한 곳 이상 골라 주세요. 아직 정하지 못했다면 직접 입력에 "미정"이라고 적어 주셔도 됩니다.'); first = first || $('[data-step="1"]'); }
    if (!c.use) { showErr('use', '예상 용도를 골라 주세요.'); first = first || $('[data-step="2"]'); }
    var digits = tel ? tel.value.replace(/\D/g, '') : '';
    if (tel && tel.value && (digits.length < 9 || digits.length > 11)) { showErr('tel', '연락처를 다시 확인해 주세요. 예: 010-1234-5678'); first = first || tel; }
    if (first) {
      e.preventDefault(); e.stopImmediatePropagation();
      first.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (first.focus) setTimeout(function () { first.focus({ preventScroll: true }); }, 400);
      if (window.track) track('form_invalid', { form: 'lease_request' });
    }
  }, true);

  /* ---------- 접수 완료 ---------- */
  form.addEventListener('lead:done', function (e) {
    var c = collect();
    var ok = $('#lrOkSum'); if (ok) ok.innerHTML = '<dl class="lr-sumlist done">' + summaryHtml(c, '—') + '</dl>';
    var aside = $('.lr-aside'); if (aside) aside.classList.add('sent');
    var top = $('.lr-ok'); if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- 주소창으로 미리 채우기 (?use=office&gu=강남구,서초구&size=20-30) ---------- */
  var q = new URLSearchParams(location.search);
  var use = q.get('use');
  if (use) { var r = form.querySelector('input[data-use="' + use + '"]'); if (r) { r.checked = true; setUse(use); } }
  (q.get('gu') || '').split(',').forEach(function (g) {
    g = g.trim(); if (!g) return;
    if (/구$/.test(g) && SEOUL_GU_MAP.gu.some(function (x) { return x[0] === g; })) addRegion(g, 'gu');
    else if (METRO.indexOf(g) > -1) { addRegion(g, 'metro'); setRegionTab('metro'); }
  });
  var size = q.get('size');
  if (size) { var a = form.querySelector('#lrArea input[data-key="' + size + '"]'); if (a) { a.checked = true; areaG.refresh(); } }
  ['dep', 'rent'].forEach(function (k) {
    var v = q.get(k); if (!v) return;
    var el = form.querySelector('#lr' + (k === 'dep' ? 'Dep' : 'Rent') + ' input[data-key="' + v + '"]'); if (el) { el.checked = true; (k === 'dep' ? depG : rentG).refresh(); }
  });
  renderRegions();
  setRegionTab(q.get('gu') && METRO.indexOf((q.get('gu') || '').split(',')[0]) > -1 ? 'metro' : 'seoul');
})();
