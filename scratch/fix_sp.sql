ALTER PROCEDURE [dbo].[SP_TRN_ENTRY_SAVE]
(
    @ID            NUMERIC(18,0) = NULL,  -- NULL = INSERT, NOT NULL = UPDATE
    @ENTRY_DATE    DATETIME = NULL,
    @DOC_NO        VARCHAR(50) = NULL,
    @DOC_TRN_TYPE  INT = NULL,
    @TRN_TYPE      INT = NULL,
    @PAY_FROM_ACC  NUMERIC(18,0) = NULL,
    @PAY_TO_ACC    NUMERIC(18,0) = NULL,
    @TRN_NO        NUMERIC(18,0) = NULL,
    @TRN_NO2       NUMERIC(18,0) = NULL,
    @DESCRIPTION   NVARCHAR(300) = NULL,
    @PAY_AMOUNT    REAL = NULL,
    @CURRENCY_NO   INT = NULL,
    @CURRENCY_RATE REAL = NULL,
    @RETURN_INVOICE BIT,
    @USER_ID       INT = NULL,
    @REF_NO        VARCHAR(50) = NULL,
    @cost_center   INT = NULL,
    @BRN_CODE      INT = NULL,
    @ACC_NAME1     NVARCHAR(200) = NULL,
    @ACC_NAME2     NVARCHAR(200) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- =========================
    -- INSERT
    -- =========================
    IF @ID IS NULL OR @ID = 0
    BEGIN
        INSERT INTO dbo.TRN_ENTRY
        (
            ENTRY_DATE,
            DOC_NO,
            DOC_TRN_TYPE,
            TRN_TYPE,
            PAY_FROM_ACC,
            PAY_TO_ACC,
            TRN_NO,
            TRN_NO2,
            DESCRIPTION,
            PAY_AMOUNT,
            Currency_no,
            Currency_rate,
            RETURN_INVOICE,
            USER_ID,
            REF_NO,
            COST_CENTER,
            BRN_CODE,
            ACC_NAME1,
            ACC_NAME2
        )
        VALUES
        (
            @ENTRY_DATE,
            @DOC_NO,
            @DOC_TRN_TYPE,
            @TRN_TYPE,
            @PAY_FROM_ACC,
            @PAY_TO_ACC,
            @TRN_NO,
            @TRN_NO2,
            @DESCRIPTION,
            @PAY_AMOUNT,
            @CURRENCY_NO,
            @CURRENCY_RATE,
            @RETURN_INVOICE,
            @USER_ID,
            @REF_NO,
            @cost_center,
            @BRN_CODE,
            @ACC_NAME1,
            @ACC_NAME2
        );

        SELECT SCOPE_IDENTITY() AS NEW_ID;
    END
    ELSE
    BEGIN
        -- =========================
        -- UPDATE
        -- =========================
        UPDATE dbo.TRN_ENTRY
        SET
            ENTRY_DATE   = @ENTRY_DATE,
            DOC_NO       = @DOC_NO,
            DOC_TRN_TYPE = @DOC_TRN_TYPE,
            TRN_TYPE     = @TRN_TYPE,
            PAY_FROM_ACC = @PAY_FROM_ACC,
            PAY_TO_ACC   = @PAY_TO_ACC,
            TRN_NO       = @TRN_NO,
            TRN_NO2      = @TRN_NO2,
            DESCRIPTION  = @DESCRIPTION,
            PAY_AMOUNT   = @PAY_AMOUNT,
            USER_ID      = @USER_ID,
            Currency_no = @CURRENCY_NO,
            Currency_rate = @CURRENCY_RATE,
            RETURN_INVOICE = @RETURN_INVOICE,
            REF_NO=@REF_NO,
            COST_CENTER=@cost_center,
            BRN_CODE=@BRN_CODE,
            ACC_NAME1=@ACC_NAME1,
            ACC_NAME2=@ACC_NAME2
        WHERE ID = @ID;

        SELECT @ID AS UPDATED_ID;
    END
END
